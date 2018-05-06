pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

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
	function Microcompany() public {
		// this is a list of action that any employee can do without voting
		addActionByEmployeesOnly("startTask");
		addActionByEmployeesOnly("startBounty");

		// this is a list of actions that require voting
		addActionByVoting("addNewTask");
		addActionByVoting("issueTokens");
	}

// IMicrocompany:
	function addNewWeiTask(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public {
		/*
		if(isCanDo(msg.sender, "addNewTask")){
			// 1 - create new task 
			WeiTask wt = new WeiTask(address(this), _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			tasks.addNewTask(wt);
		}else{
			// 2 - create new vote?
			WeiTaskDecision wtd = new WeiTaskDecision(address(this), _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			decisions.addNewDecision(wtd);
		}
		*/
	}

	function isEmployee(address _a)public returns(bool){
		for(uint i=0; i<employeesCount; ++i){
			if(employees[i]==_a){
				return true;
			}
		}
		return false;
	}

	function isCanDo(address _a, string _permissionName)public returns(bool){
		// 1 - check if employees can do that without voting?
		if(isCanDoByEmployee(_a,_permissionName)){
			return true;
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
	function isCanDoByEmployee(address _a, string _permissionName) internal returns(bool){
		for(uint i=0; i<actionsByEmployeeCount; ++i){
			if(keccak256(_permissionName)==keccak256(byEmployee[i])){
				return isEmployee(_a);
			}
		}
		return false;
	}

	function isCanDoByVoting(address _a, string _permissionName) internal returns(bool){
		for(uint i=0; i<actionsByVotingCount; ++i){
			if(keccak256(_permissionName)==keccak256(byVoting[i])){
				return true;
			}
		}
		return false;
	}

	function getVotingResults(address _caller) internal returns (bool isVotingFound, bool votingResult){
		// TODO:
		return (false,false);
	}

	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a) internal returns(bool){
		// TODO:
		return false;
	}
}
