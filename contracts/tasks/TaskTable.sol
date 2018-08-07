pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../moneyflow/ether/WeiExpense.sol";

import "../IDaoBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title WeiGenericTask 
 * @dev Basic contract for WeiTask and WeiBounty
 *
 * 4 types of tasks:
 *		PrePaid 
 *		PostPaid with known neededWei amount 
 *		PostPaid with unknown neededWei amount. Task is evaluated AFTER work is complete
 *		PostPaid donation - client pays any amount he wants AFTER work is complete
 * 
 * WeiAbsoluteExpense:
 *		has 'owner'	(i.e. "admin")
 *		has 'moneySource' (i.e. "client")
 *		has 'neededWei'
 *		has 'processFunds(uint _currentFlow)' payable function 
 *		has 'setNeededWei(uint _neededWei)' 
*/ 
contract TaskTable is Ownable {
	uint public elementsCount = 0;

	bytes32 constant public START_TASK = keccak256("startTask");
	bytes32 constant public START_BOUNTY = keccak256("startBounty");

	enum ElementTypes {
		PrePaid,
		PostPaid
	}

	event ElementAdded(uint _eId, ElementTypes _eType);
	event TaskTable_SetEmployee(address _employee);
	event TaskTable_SetOutput(address _output);
	event TaskTable_StateChanged(State _state);
	event TaskTable_ProcessFunds(address _client, uint _value, uint _id);
	

	enum State {
		Init,
		Cancelled,
		// only for (isPostpaid==false) tasks
		// anyone can use 'processFunds' to send money to this task
		PrePaid,

		// These are set by Employee:
		InProgress,
		CompleteButNeedsEvaluation,	// in case neededWei is 0 -> we should evaluate task first and set it
												// please call 'evaluateAndSetNeededWei'
		Complete,

		// These are set by Creator or Client:
		CanGetFunds,						// call flush to get funds
		Finished,								// funds are transferred to the output and the task is finished
		DeadlineMissed
	}

	struct Task {
		IDaoBase dao;

		string caption;
		string desc;
		bool isPostpaid;
		bool isDonation;
		uint neededWei;
		uint64 deadlineTime;
		uint64 timeToCancell;
		State state;
		address employee;
		address output;
		address moneySource;
		uint startTime;
		uint creationTime;
		uint funds;
	}

	mapping (uint => ElementTypes) elementsType;
	mapping (uint => Task) Tasks;

	modifier onlyWhenStarted(uint _id) { 
		require (Tasks[_id].startTime >= block.timestamp); 
		_; 
	}

	modifier onlyEmployeeOrOwner(uint _id) { 
		require(msg.sender== Tasks[_id].employee || msg.sender==owner); 
		_; 
	}

	modifier isCanCancell(uint _id) { 
		require (block.timestamp - Tasks[_id].creationTime >= Tasks[_id].timeToCancell); 
		_; 
	}

	modifier isDeadlineMissed(uint _id) { 
		require (block.timestamp - Tasks[_id].startTime >= Tasks[_id].deadlineTime); 
		_; 
	}

	modifier onlyByMoneySource(uint _id) { 
		require (Tasks[_id].moneySource == msg.sender); 
		_; 
	}
	
	modifier isCanDo(uint _id, bytes32 _what){
		require(Tasks[_id].dao.isCanDoAction(msg.sender,_what)); 
		_; 
	}

	function addNewTask(IDaoBase _dao, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) external returns(uint){
		Tasks[elementsCount] = Task(_dao, _caption, _desc, _isPostpaid, _isDonation, _neededWei, _deadlineTime * 1 hours, _timeToCancell * 1 hours, State.Init, address(0), address(0), msg.sender, 0, block.timestamp, 0);

		if(_isPostpaid){
			elementsType[elementsCount] = ElementTypes.PostPaid;
		} else {
			elementsType[elementsCount] = ElementTypes.PrePaid;
		}

		emit ElementAdded(elementsCount, elementsType[elementsCount]);
		elementsCount += 1;

		return elementsCount-1;
	}

	function addNewBounty (IDaoBase _dao, string _caption, string _desc, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) external returns(uint){
		Tasks[elementsCount] = Task(_dao, _caption, _desc, false, false, _neededWei, _deadlineTime * 1 hours, _timeToCancell * 1 hours, State.Init, address(0), address(0), msg.sender, 0, block.timestamp, 0);

		elementsType[elementsCount] = ElementTypes.PrePaid;

		emit ElementAdded(elementsCount, elementsType[elementsCount]);
		elementsCount += 1;

		return elementsCount-1;
	}

	function startTask(uint _id, address _employee) public isCanDo(_id, START_TASK) {
		require(getCurrentState(_id)==State.Init || getCurrentState(_id)==State.PrePaid);

		if(getCurrentState(_id)==State.Init) {
			// can start only if postpaid task 
			require(Tasks[_id].isPostpaid);
		}
		Tasks[_id].startTime = block.timestamp;
		Tasks[_id].employee = _employee;
		Tasks[_id].state = State.InProgress;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	// callable by anyone
	function startBounty(uint _id) public isCanDo(_id, START_BOUNTY) {
		require(getCurrentState(_id)==State.PrePaid);
		Tasks[_id].startTime = block.timestamp;
		Tasks[_id].employee = msg.sender;
		Tasks[_id].state = State.InProgress;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	// who will complete this task
	function setEmployee(uint _id, address _employee) onlyOwner public {
		emit TaskTable_SetEmployee(_employee);
		Tasks[_id].employee = _employee;
	}

	// where to send money
	function setOutput(uint _id, address _output) onlyOwner public {
		emit TaskTable_SetOutput(_output);
		Tasks[_id].output = _output;
	}

	function getBalance(uint _id) public view returns(uint) {
		return Tasks[_id].funds;
	}

	function getCurrentState(uint _id) public view returns(State) {
		// for Prepaid task -> client should call processFunds method to put money into this task
		// when state is Init
		if((State.Init==Tasks[_id].state) && (Tasks[_id].neededWei!=0) && (!Tasks[_id].isPostpaid)) {
			if(Tasks[_id].neededWei==Tasks[_id].funds && Tasks[_id].funds <= address(this).balance) {
				return State.PrePaid;
			}
		}

		// for Postpaid task -> client should call processFunds method to put money into this task
		// when state is Complete. He is confirming the task by doing that (no need to call confirmCompletion)
		if((State.Complete==Tasks[_id].state) && (Tasks[_id].neededWei!=0) && (Tasks[_id].isPostpaid)) {
			if(Tasks[_id].neededWei==Tasks[_id].funds && Tasks[_id].funds <= address(this).balance) {
				return State.CanGetFunds;
			}
		}

		return Tasks[_id].state;
	}

	function cancell(uint _id) onlyOwner isCanCancell(_id) public {
		require(getCurrentState(_id)==State.Init || getCurrentState(_id)==State.PrePaid);
		if(getCurrentState(_id)==State.PrePaid) {
			// return money to 'moneySource'
			Tasks[_id].moneySource.transfer(Tasks[_id].funds);
		}
		Tasks[_id].state = State.Cancelled;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	function returnMoney(uint _id) isDeadlineMissed(_id) onlyOwner public {
		require(getCurrentState(_id)==State.InProgress);
		if(address(this).balance >= Tasks[_id].funds) {
			// return money to 'moneySource'
			Tasks[_id].moneySource.transfer(Tasks[_id].funds);
		}
		Tasks[_id].state = State.DeadlineMissed;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	function notifyThatCompleted(uint _id) public onlyEmployeeOrOwner(_id) {
		require(getCurrentState(_id)==State.InProgress);

		if((0!=Tasks[_id].neededWei) || (Tasks[_id].isDonation)) { // if donation or prePaid - no need in ev-ion; if postpaid with unknown payment - neededWei=0 yet
			Tasks[_id].state = State.Complete;
			emit TaskTable_StateChanged(Tasks[_id].state);
		}else {
			Tasks[_id].state = State.CompleteButNeedsEvaluation;
			emit TaskTable_StateChanged(Tasks[_id].state);
		}
	}

	function evaluateAndSetNeededWei(uint _id, uint _neededWei) public onlyOwner {
		require(getCurrentState(_id)==State.CompleteButNeedsEvaluation);
		require(0==Tasks[_id].neededWei);

		Tasks[_id].neededWei = _neededWei;
		Tasks[_id].state = State.Complete;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	// for Prepaid tasks only! 
	// for Postpaid: call processFunds and transfer money instead!
	function confirmCompletion(uint _id) public onlyByMoneySource(_id) {
		require(getCurrentState(_id)==State.Complete);
		require(!Tasks[_id].isPostpaid);
		require(0!=Tasks[_id].neededWei);

		Tasks[_id].state = State.CanGetFunds;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

// IDestination overrides:
	// pull model
	function flush(uint _id) public {
		require(getCurrentState(_id)==State.CanGetFunds);
		require(0x0!=Tasks[_id].output);

		Tasks[_id].output.transfer(Tasks[_id].funds);
		Tasks[_id].state = State.Finished;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	function processFunds(uint _id) public payable {
		emit TaskTable_ProcessFunds(msg.sender, msg.value, _id);
		if(Tasks[_id].isPostpaid && (0==Tasks[_id].neededWei) && (State.Complete==Tasks[_id].state)) {
			// this is a donation
			// client can send any sum!
			Tasks[_id].neededWei = msg.value;
		}
		Tasks[_id].funds += msg.value;
	}

	// non-payable
	function()public {
	}
}
