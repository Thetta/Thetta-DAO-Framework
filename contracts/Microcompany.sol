pragma solidity ^0.4.15;

import "./IMicrocompany.sol";
import "./tasks/Tasks.sol";
import "./governance/Votes.sol";

contract Permissions {
	mapping (uint=>string) byEmployee;
	uint actionsByEmployeeCount = 0;

	mapping (uint=>string) byVoting;
	uint actionsByVotingCount = 0;

	function addActionByEmployeesOnly(string _what) internal {
		byEmployee[actionsByEmployeeCount] = _what;
		++actionsByEmployeeCount;
	}

	function addActionByVoting(string _what) internal {
		byVoting[actionsByVotingCount] = _what;
		++actionsByVotingCount;
	}

	function isCanDoByEmployee(string _permissionName) internal constant returns(bool){
		for(uint i=0; i<actionsByEmployeeCount; ++i){
			if(keccak256(_permissionName)==keccak256(byEmployee[i])){
				return true;
			}
		}
		return false;
	}

	function isCanDoByVoting(string _permissionName) internal constant returns(bool){
		for(uint i=0; i<actionsByVotingCount; ++i){
			if(keccak256(_permissionName)==keccak256(byVoting[i])){
				return true;
			}
		}
		return false;
	}
}

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
contract Microcompany is IMicrocompany, Permissions {
	mapping (uint=>address) tasks;
	uint tasksCount = 0;

	mapping (uint=>address) votes;
	uint votesCount = 0;

	mapping (uint=>address) employees;
	uint employeesCount = 0;

	// Constructor
	function Microcompany() public {
		// this is a list of action that any employee can do without voting
		addActionByEmployeesOnly("addNewVote");
		addActionByEmployeesOnly("startTask");
		addActionByEmployeesOnly("startBounty");

		// this is a list of actions that require voting
		addActionByVoting("addNewEmployee");
		addActionByVoting("addNewTask");
		addActionByVoting("issueTokens");
	}

   modifier isCanDo(string _what){
		require(isCanDoAction(msg.sender,_what)); 
		_; 
	}

	// TODO: get (enumerator) for votes
	// TODO: get (enumerator) for tasks 

// IMicrocompany:
	function addNewVote(address _vote) public isCanDo("addNewVote"){
		votes[votesCount] = _vote;
		votesCount++;
	}

	// this should be called either directly or from the Vote...
	function addNewWeiTask(address _task) public isCanDo("addNewTask"){
		tasks[tasksCount] = _task;
		tasksCount++;
	}

	// experimental...
	function addNewWeiTask2(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public {
		if(isCanDoAction(msg.sender, "addNewTask")){
			// 1 - create new task immediately
			WeiTask wt = new WeiTask(address(this), _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			tasks[tasksCount] = wt;
			tasksCount++;
		}else{
			// 2 - create new vote instead
			AddNewTaskVote antv = new AddNewTaskVote(address(this), _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			votes[votesCount] = antv;
			votesCount++;
		}
	}

	// TODO: caller must make sure that he is not adding same employee twice
	function addEmployee(address _newEmployee) public isCanDo("addNewEmployee") {
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

	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		// 1 - check if employees can do that without voting?
		if(isCanDoByEmployee(_permissionName) && isEmployee(_a)){
			return true;
		}

		// 2 - can do action only by starting new vote first?
		if(isCanDoByVoting(_permissionName)){
			var (isVotingFound, votingResult) = getVotingResults(msg.sender);
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
	function getVotingResults(address _vote) internal constant returns (bool isVotingFound, bool votingResult){
		// scan all votings and search for the one that is finished 
		for(uint i=0; i<votesCount; ++i){
			if(votes[i]==_vote){
				IVote vote = IVote(votes[i]);
				return (true, 	vote.isFinished() && vote.isYes());
			}
		}

		return (false,false);
	}

	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a) internal constant returns(bool){
		// TODO:
		// if we have many tokens -> we should scan all and check if have more than 51% of governance type 

		// TODO:
		return false;
	}
}
