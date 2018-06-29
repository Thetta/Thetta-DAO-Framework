pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import '../moneyflow/ether/WeiExpense.sol';

import '../IDaoBase.sol';

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
contract WeiGenericTask is WeiAbsoluteExpense {
	// use DaoClient instead?
	// (it will handle upgrades)
	IDaoBase dao;
	address employee = 0x0;		// who should complete this task and report on completion
										// this will be set later
	address output = 0x0;		// where to send money (can be split later)
										// can be set later too
	string public caption = "";
	string public desc = "";
	bool public isPostpaid = false;		// prepaid/postpaid switch

	bool public isDonation = false;		// if true -> any price

	uint256 public creationTime;

	uint256 public startTime;

	uint64 public timeToCancell;

	uint64 public deadlineTime;

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
	// Use 'getCurrentState' method instead to access state outside of contract
	State state = State.Init;

	event WeiGenericTask_SetEmployee(address  _employee);
	event WeiGenericTask_SetOutput(address _output);
	event WeiGenericTask_ProcessFunds(address _sender, uint _value, uint _currentFlow);
	event WeiGenericTask_StateChanged(State _state);

	modifier onlyEmployeeOrOwner() { 
		require(msg.sender==employee || msg.sender==owner); 
		_; 
	}

	modifier isCanCancell() { 
		require (now - creationTime >= timeToCancell); 
		_; 
	}

	modifier isDeadlineMissed() { 
		require (now - startTime >= deadlineTime); 
		_; 
	}
	

	/*
	modifier onlyAnyEmployeeOrOwner() { 
		require(dao.isEmployee(msg.sender) || msg.sender==owner); 
		_; 
	}
   */

   modifier isCanDo(bytes32 _what){
		require(dao.isCanDoAction(msg.sender,_what)); 
		_; 
	}

	// if _neededWei==0 -> this is an 'Unknown cost' situation. use 'setNeededWei' method of WeiAbsoluteExpense
	constructor(
		IDaoBase _dao, 
		string _caption, 
		string _desc, 
		bool _isPostpaid, 
		bool _isDonation, 
		uint _neededWei, 
		uint64 _deadlineTime,
		uint64 _timeToCancell) public WeiAbsoluteExpense(_neededWei) 
	{
		require (_timeToCancell > 0);
		require (_deadlineTime > 0);
		
		// Donation should be postpaid 
		if(_isDonation) {
			require(_isPostpaid); 
		}

		if(!_isPostpaid){
			require(_neededWei>0);
		}

		creationTime = now;
		dao = _dao;
		caption = _caption;
		desc = _desc;
		isPostpaid = _isPostpaid;
		isDonation = _isDonation;
		deadlineTime = _deadlineTime;
		timeToCancell = _timeToCancell * 1 hours;
	}

	// who will complete this task
	function setEmployee(address _employee) external onlyOwner {
		emit WeiGenericTask_SetEmployee(_employee);
		employee = _employee;
	}

	// where to send money
	function setOutput(address _output) external onlyOwner {
		emit WeiGenericTask_SetOutput(_output);
		output = _output;
	}

	function getBalance()external view returns(uint){
		return address(this).balance;
	}

	function getCurrentState()external view returns(State){
		return _getCurrentState();
	}

	function _getCurrentState()internal view returns(State){
		// for Prepaid task -> client should call processFunds method to put money into this task
		// when state is Init
		if((State.Init==state) && (neededWei!=0) && (!isPostpaid)){
			if(neededWei==address(this).balance){
				return State.PrePaid;
			}
		}

		// for Postpaid task -> client should call processFunds method to put money into this task
		// when state is Complete. He is confirming the task by doing that (no need to call confirmCompletion)
		if((State.Complete==state) && (neededWei!=0) && (isPostpaid)){
			if(neededWei==address(this).balance){
				return State.CanGetFunds;
			}
		}

		return state; 
	}

	function cancell() external isCanCancell onlyOwner {
		require(_getCurrentState()==State.Init || _getCurrentState()==State.PrePaid);
		if(_getCurrentState()==State.PrePaid){
			// return money to 'moneySource'
			moneySource.transfer(address(this).balance);
		}
		state = State.Cancelled;
		emit WeiGenericTask_StateChanged(state);
	}

	function returnMoney() external isDeadlineMissed onlyOwner {
		require(_getCurrentState()==State.InProgress);
		if(address(this).balance > 0){
			// return money to 'moneySource'
			moneySource.transfer(address(this).balance);
		}
		state = State.DeadlineMissed;
		emit WeiGenericTask_StateChanged(state);
	}

	function notifyThatCompleted() external onlyEmployeeOrOwner {
		require(_getCurrentState()==State.InProgress);

		if((0!=neededWei) || (isDonation)){ // if donation or prePaid - no need in ev-ion; if postpaid with unknown payment - neededWei=0 yet

			state = State.Complete;
			emit WeiGenericTask_StateChanged(state);
		}else{
			state = State.CompleteButNeedsEvaluation;
			emit WeiGenericTask_StateChanged(state);
		}
	}

	function evaluateAndSetNeededWei(uint _neededWei) external onlyOwner {
		require(_getCurrentState()==State.CompleteButNeedsEvaluation);
		require(0==neededWei);

		neededWei = _neededWei;
		state = State.Complete;
		emit WeiGenericTask_StateChanged(state);
	}

	// for Prepaid tasks only! 
	// for Postpaid: call processFunds and transfer money instead!
	function confirmCompletion() external onlyByMoneySource {
		require(_getCurrentState()==State.Complete);
		require(!isPostpaid);
		require(0!=neededWei);

		state = State.CanGetFunds;
		emit WeiGenericTask_StateChanged(state);
	}

// IDestination overrides:
	// pull model
	function flush() external {
		require(_getCurrentState()==State.CanGetFunds);
		require(0x0!=output);

		output.transfer(address(this).balance);
		state = State.Finished;
		emit WeiGenericTask_StateChanged(state);
	}

	function flushTo(address _to) external {
		if(_to==_to) revert();
	}

	function processFunds(uint _currentFlow) external payable{
		emit WeiGenericTask_ProcessFunds(msg.sender, msg.value, _currentFlow);
		if(isPostpaid && (0==neededWei) && (State.Complete==state)){
			// this is a donation
			// client can send any sum!
			neededWei = msg.value;
		}

		super._processFunds(_currentFlow);
	}

	// non-payable
	function()public{
	}
}

/**
 * @title WeiTask 
 * @dev Can be prepaid or postpaid. 
*/
contract WeiTask is WeiGenericTask {
	constructor(IDaoBase _dao, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) public 
		WeiGenericTask(_dao, _caption, _desc, _isPostpaid, _isDonation, _neededWei, _deadlineTime, _timeToCancell) 
	{
	}

	// callable by any Employee of the current DaoBase or Owner
	function startTask(address _employee) public isCanDo(START_TASK) {
		require(_getCurrentState()==State.Init || _getCurrentState()==State.PrePaid);

		if(_getCurrentState()==State.Init){
			// can start only if postpaid task 
			require(isPostpaid);
		}
		startTime = now;
		employee = _employee;
		state = State.InProgress;
		emit WeiGenericTask_StateChanged(state);
	}
}

/**
 * @title WeiBounty 
 * @dev Bounty is when you put money, then someone outside the DAO works
 * That is why bounty is always prepaid 
*/
contract WeiBounty is WeiGenericTask {
	constructor(IDaoBase _dao, string _caption, string _desc, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) public 
		WeiGenericTask(_dao, _caption, _desc, false, false, _neededWei, _deadlineTime, _timeToCancell) 
	{
	}

	// callable by anyone
	function startTask() public isCanDo(START_BOUNTY) {
		require(_getCurrentState()==State.PrePaid);
		startTime = now;
		employee = msg.sender;
		state = State.InProgress;
		emit WeiGenericTask_StateChanged(state);
	}
}
