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

	function isCanDoByEmployee(address _a, string _permissionName) internal constant returns(bool){
		for(uint i=0; i<actionsByEmployeeCount; ++i){
			if(keccak256(_permissionName)==keccak256(byEmployee[i])){
				return true;
			}
		}
		return false;
	}

	function isCanDoByVoting(address _a, string _permissionName) internal constant returns(bool){
		for(uint i=0; i<actionsByVotingCount; ++i){
			if(keccak256(_permissionName)==keccak256(byVoting[i])){
				return true;
			}
		}
		return false;
	}

}

contract Employees {
	// TODO: add, remove employees
	mapping (uint=>address) employees;
	uint employeesCount = 0;
}

/*
// Add new task
shouldBeEmployee("")										// can be any employee
shouldBeEmployee("addNewTask")						// should be an employee with addNewTask permission 
shouldHaveTokensOfType("Gov",51%)					// should have at least 51% gov tokens
shouldHaveTokensOfName("DividendsToken",51%)		// should have at least 51% of 

shouldBeVoted()
*/

// 1) Gov.token holder
// 2) Employee 

// 1) Any
// 1) With a specific role -> permission (“addNewBounty”) 
// 2) With reputation

// Examples:
//		add new task -> voting
//		add new expense -> voting
//		issue tokens -> voting 
//		add new employee -> voting
//		
//		start task -> any employee 
//		
contract Microcompany is IMicrocompany, Permissions, Employees {
	mapping (uint=>address) tasks;
	uint tasksCount = 0;

	mapping (uint=>address) votes;
	uint votesCount = 0;

	function addNewVote(address _vote) public {
		votes[votesCount] = _vote;
		votesCount++;
	}

	// Constructor
	function Microcompany() public {
		// this is a list of action that any employee can do without voting
		addActionByEmployeesOnly("startTask");
		addActionByEmployeesOnly("startBounty");

		// this is a list of actions that require voting
		addActionByVoting("addNewTask");
		addActionByVoting("issueTokens");
	}

   modifier isCanDo(string _what){
		require(isCanDoAction(msg.sender,_what)); 
		_; 
	}

// IMicrocompany:
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
		if(isCanDoByEmployee(_a,_permissionName)){
			return isEmployee(_a);
		}

		// 2 - can do action only by starting new vote first?
		if(isCanDoByVoting(_a,_permissionName)){
			// only token holders with > 51% of gov.tokens can add new task immediately 
			// otherwise -> start voting
			if(isInMajority(_a)){
				return true;
			}

			var (isVotingFound, votingResult) = getVotingResults(msg.sender);
			if(isVotingFound){
				return votingResult;
			}
			
			// 3 - please start new voting first
			return false;
		}

		// in case _permissionName is not handled...
		revert();
		return false;
	}

// Internal:
	function getVotingResults(address _caller) internal constant returns (bool isVotingFound, bool votingResult){
		// TODO:
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
