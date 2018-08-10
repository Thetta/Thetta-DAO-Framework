pragma solidity ^0.4.22;


import "../IDaoBase.sol";

contract TaskTable {
	uint public elementsCount = 0;
	IDaoBase dao;

	//bytes32 constant public START_TASK = keccak256("startTask");
	bytes32 constant public START_TASK = 0x437e6b65d0608a0fe9c825ff4057ee9aef5baaa03f6eec7cf85e76e979099b12;
	//bytes32 constant public START_BOUNTY = keccak256("startBounty");
	bytes32 constant public START_BOUNTY = 0x79533ccfda313ec99b8522f2b18f04c46a6a6ac854db0c234fa8d207626d4fb9;

	event TaskTable_ElementAdded(uint _eId, State _eType);
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
		PostPaid,

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

	mapping (uint => Task) Tasks;

	modifier onlyWhenStarted(uint _id) { 
		require (Tasks[_id].startTime >= block.timestamp); 
		_; 
	}

	modifier onlyEmployeeOrMoneySource(uint _id) { 
		require(msg.sender== Tasks[_id].employee || msg.sender==Tasks[_id].moneySource); 
		_; 
	}

	modifier isCanCancel(uint _id) { 
		require (block.timestamp - Tasks[_id].creationTime <= Tasks[_id].timeToCancell); 
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
	
	modifier isCanDo(bytes32 _what){
		require(dao.isCanDoAction(msg.sender,_what)); 
		_; 
	}

	constructor(IDaoBase _dao) public {
		dao = _dao;
	}

	function addNewTask(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) external returns(uint){
		Tasks[elementsCount] = Task(_caption, 
			_desc, 
			_isPostpaid, 
			_isDonation, 
			_neededWei, 
			_deadlineTime * 1 hours, 
			_timeToCancell * 1 hours, 
			State.Init, 
			address(0), 
			address(0), 
			msg.sender, 
			0, 
			block.timestamp, 
			0);

			Tasks[elementsCount].state = State.Init;

		emit TaskTable_ElementAdded(elementsCount, Tasks[elementsCount].state);
		elementsCount += 1;

		return (elementsCount - 1);
	}

	function addNewBounty (string _caption, string _desc, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) external returns(uint){
		Tasks[elementsCount] = Task(_caption, 
			_desc, 
			false, 
			false, 
			_neededWei, 
			_deadlineTime * 1 hours, 
			_timeToCancell * 1 hours, 
			State.Init, address(0), 
			address(0),
			msg.sender, 
			0, 
			block.timestamp, 
			0);

		Tasks[elementsCount].state = State.PrePaid;

		emit TaskTable_ElementAdded(elementsCount, Tasks[elementsCount].state);
		elementsCount += 1;

		return (elementsCount - 1);
	}

	function startTask(uint _id, address _employee) public isCanDo(START_TASK) {
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
	function startBounty(uint _id) public isCanDo(START_BOUNTY) {
		require(getCurrentState(_id)==State.PrePaid);
		Tasks[_id].startTime = block.timestamp;
		Tasks[_id].employee = msg.sender;
		Tasks[_id].state = State.InProgress;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	// who will complete this task
	function setEmployee(uint _id, address _employee) onlyByMoneySource(_id) public {
		emit TaskTable_SetEmployee(_employee);
		Tasks[_id].employee = _employee;
	}

	// where to send money
	function setOutput(uint _id, address _output) onlyByMoneySource(_id) public {
		emit TaskTable_SetOutput(_output);
		Tasks[_id].output = _output;
	}

	function getBalance(uint _id) public view returns(uint) {
		return Tasks[_id].funds;
	}

	function getCaption(uint _id) public view returns(string) {
		return Tasks[_id].caption;
	}

	function getDescription(uint _id) public view returns(string) {
		return Tasks[_id].desc;
	}

	function getCurrentState(uint _id) public view returns(State) {
		// for Prepaid task -> client should call processFunds method to put money into this task
		// when state is Init
		if(isTaskPrepaid(_id)) {
			return State.PrePaid;
		}

		// for Postpaid task -> client should call processFunds method to put money into this task
		// when state is Complete. He is confirming the task by doing that (no need to call confirmCompletion)
		if(isTaskPostpaidAndCompleted(_id)) {
				return State.CanGetFunds;
		}

		return Tasks[_id].state;
	}

	function isTaskPrepaid(uint _id) internal view returns(bool){
		if((State.Init==Tasks[_id].state) && (Tasks[_id].neededWei!=0) && (!Tasks[_id].isPostpaid)) {
			if(Tasks[_id].neededWei==Tasks[_id].funds && Tasks[_id].funds <= address(this).balance) {
				return true;
			}
		}
		return false;
	}

	function isTaskPostpaidAndCompleted(uint _id) internal view returns(bool){
		if((State.Complete==Tasks[_id].state) && (Tasks[_id].neededWei!=0) && (Tasks[_id].isPostpaid)) {
			if(Tasks[_id].neededWei <= Tasks[_id].funds && Tasks[_id].funds <= address(this).balance) {
				return true;
			}
		}
		return false;
	}

	function cancel(uint _id) onlyByMoneySource(_id) isCanCancel(_id) public {
		require(getCurrentState(_id)==State.Init || getCurrentState(_id)==State.PrePaid);
		if(getCurrentState(_id)==State.PrePaid) {
			// return money to 'moneySource'
			Tasks[_id].moneySource.transfer(Tasks[_id].funds);
		}
		Tasks[_id].state = State.Cancelled;
		emit TaskTable_StateChanged(Tasks[_id].state);
	}

	function returnMoney(uint _id) isDeadlineMissed(_id) onlyByMoneySource(_id) public {
		require(getCurrentState(_id)==State.InProgress);
		if(address(this).balance >= Tasks[_id].funds) {
			// return money to 'moneySource'
			Tasks[_id].moneySource.transfer(Tasks[_id].funds);
		}
		Tasks[_id].state = State.DeadlineMissed;
		emit TaskTable_StateChanged(Tasks[_id].state); 
	}

	function notifyThatCompleted(uint _id) public onlyEmployeeOrMoneySource(_id) {
		require(getCurrentState(_id)==State.InProgress);

		if((0!=Tasks[_id].neededWei) || (Tasks[_id].isDonation)) { // if donation or prePaid - no need in ev-ion; if postpaid with unknown payment - neededWei=0 yet
			Tasks[_id].state = State.Complete;
			emit TaskTable_StateChanged(Tasks[_id].state);
		}else {
			Tasks[_id].state = State.CompleteButNeedsEvaluation;
			emit TaskTable_StateChanged(Tasks[_id].state);
		}
	}

	function evaluateAndSetNeededWei(uint _id, uint _neededWei) public onlyByMoneySource(_id) {
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
		if(isCanSetNeededWei(_id)) {
			// this is a donation
			// client can send any sum!
			Tasks[_id].neededWei = msg.value;
		}
		Tasks[_id].funds += msg.value;
	}

	function isCanSetNeededWei(uint _id) internal view returns(bool){
		if(Tasks[_id].isPostpaid && (0==Tasks[_id].neededWei) && (State.Complete==Tasks[_id].state)){
			return true;
		}

		return false;
	}
	

	// non-payable
	function()public {
	}
}
