pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./tasks/Tasks.sol";
import "./governance/Votes.sol";

//import "./token/MicrocompanyTokens.sol";

// Different types of Members:
// 1) Gov.token holder
// 2) Employee 
// 3) Any address

// Conditions
// 1) With a specific role -> permission (“addNewBounty”) 
// 2) With reputation
// 3) 

// Examples:
//		add new task -> voting
//		add new expense -> voting
//		issue tokens -> voting 
//		add new employee -> voting
//		
//		start task -> any employee 
//		
contract MicrocompanyStorage {
	mapping (uint=>address) tasks;
	uint tasksCount = 0;

	mapping (uint=>address) votes;
	uint votesCount = 0;

	mapping (uint=>address) employees;
	uint employeesCount = 0;

	mapping (bytes32=>bool) byEmployee;
	mapping (bytes32=>bool) byVoting;

	function MicrocompanyStorage() public {
		//stdToken = _stdToken;
	}

// Permissions:
	// TODO: public
	function addActionByEmployeesOnly(bytes32 _what) public {
		byEmployee[_what] = true;
	}

	// TODO: public
	function addActionByVoting(bytes32 _what) public {
		byVoting[_what] = true;
	}

	function isCanDoByEmployee(bytes32 _permissionName) public constant returns(bool){
		return byEmployee[_permissionName];
	}

	function isCanDoByVoting(bytes32 _permissionName) public constant returns(bool){
		return byVoting[_permissionName];
	}

	// TODO: public
	function addNewWeiTask(address _task) public {
		tasks[tasksCount] = _task;
		tasksCount++;
	}

	// TODO: public
	function addNewVote(address _vote) public {
		votes[votesCount] = _vote;
		votesCount++;
	}

	// TODO: public
	function addNewEmployee(address _newEmployee) public {
		employees[employeesCount] = _newEmployee;
		employeesCount++;
	}

	function isEmployee(address _a)public constant returns(bool){
		for(uint i=0; i<employeesCount; ++i){
			if(employees[i]==_a){
				return true;
			}
		}
		return false;
	}

	function getVotingResults(address _vote) public constant returns (bool isVotingFound, bool votingResult){
		// scan all votings and search for the one that is finished 
		for(uint i=0; i<votesCount; ++i){
			if(votes[i]==_vote){
				IVote vote = IVote(votes[i]);
				return (true, 	vote.isFinished() && vote.isYes());
			}
		}

		return (false,false);
	}
}

contract Microcompany is IMicrocompany {
	MicrocompanyStorage store;

	// Constructor
	function Microcompany(MicrocompanyStorage _store) public {
		store = _store;

		// this is a list of action that any employee can do without voting
		store.addActionByEmployeesOnly(keccak256("addNewVote"));
		store.addActionByEmployeesOnly(keccak256("startTask"));
		store.addActionByEmployeesOnly(keccak256("startBounty"));

		// this is a list of actions that require voting
		//store.addActionByVoting(keccak256("addNewEmployee"));
		//store.addActionByVoting(keccak256("addNewTask"));
		//store.addActionByVoting(keccak256("issueTokens"));

		// issue all 100% tokens to the creator
		//issueTokensInternal(msg.sender,1000);
	}

   modifier isCanDo(string _what){
		require(isCanDoAction(msg.sender,_what)); 
		_; 
	}

	// TODO: get (enumerator) for votes
	// TODO: get (enumerator) for tasks 

// IMicrocompany:
	function issueTokens(address _to, uint amount){
		// TODO
	}

	// TODO:
	function issueTokensInternal(address _to, uint _amount) internal {
		//StdMicrocompanyToken(stdToken).mint(_to, _amount);
	}

	//
	function addNewVote(address _vote) public isCanDo("addNewVote"){
		store.addNewVote(_vote);
	}

	// this should be called either directly or from the Vote...
	function addNewWeiTask(address _task) public isCanDo("addNewTask"){
		store.addNewWeiTask(_task);
	}

	// experimental...
	function addNewWeiTask2(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public {
		if(isCanDoAction(msg.sender, "addNewTask")){
			// 1 - create new task immediately
			WeiTask wt = new WeiTask(address(this), _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			store.addNewWeiTask(wt);
		}else{
			// 2 - create new vote instead
			AddNewTaskVote antv = new AddNewTaskVote(address(this), _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			store.addNewVote(antv);
		}
	}

	// caller should make sure that he is not adding same employee twice
	function addNewEmployee(address _newEmployee) public isCanDo("addNewEmployee") {
		store.addNewEmployee(_newEmployee);
	}

	function isEmployee(address _a)public constant returns(bool){
		return store.isEmployee(_a);
	}

	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		// 1 - check if employees can do that without voting?
		if(store.isCanDoByEmployee(keccak256(_permissionName)) && isEmployee(_a)){
			return true;
		}

		// 2 - can do action only by starting new vote first?
		if(store.isCanDoByVoting(keccak256(_permissionName))){
			var (isVotingFound, votingResult) = store.getVotingResults(msg.sender);
			if(isVotingFound){
				return votingResult;
			}
			
			// 3 - only token holders with > 51% of gov.tokens can add new task immediately 
			// otherwise -> start voting
			if(isInMajority(_a)){
				return true;
			}

			// 4 - please start new voting first
			return false;
		}

		// in case _permissionName is not handled...
		revert();
		return false;
	}

// Internal:
	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a) public constant returns(bool){
		// TODO:
		// if we have many tokens -> we should scan all and check if have more than 51% of governance type 

		// TODO:
		//return(stdToken.balanceOf(_a)>=stdToken.totalSupply()/2);
		return false;
	}
}
