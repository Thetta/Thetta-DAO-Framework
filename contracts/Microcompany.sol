pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./tasks/Tasks.sol";
import "./governance/Votes.sol";
import "./token/MicrocompanyTokens.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

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
	uint public tasksCount = 0;

	mapping (uint=>address) votes;
	uint public votesCount = 0;

	mapping (uint=>address) employees;
	uint public employeesCount = 0;

	mapping (string=>bool) byEmployee;
	mapping (string=>bool) byVoting;

	function MicrocompanyStorage() public {

	}

// Permissions:
	// TODO: public
	function addActionByEmployeesOnly(string _what) public {
		byEmployee[_what] = true;
	}

	// TODO: public
	function addActionByVoting(string _what) public {
		byVoting[_what] = true;
	}

	function isCanDoByEmployee(string _permissionName) public constant returns(bool){
		return byEmployee[_permissionName];
	}

	function isCanDoByVoting(string _permissionName) public constant returns(bool){
		return byVoting[_permissionName];
	}

// Tasks:
	// TODO: public
	function addNewWeiTask(address _task) public {
		tasks[tasksCount] = _task;
		tasksCount++;
	}

// Vote:
	// TODO: public
	function addNewVote(address _vote) public {
		votes[votesCount] = _vote;
		votesCount++;
	}

	function getVoteAtIndex(uint _i)public returns(address){
		require(_i<votesCount);
		return votes[_i];
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

// Employees:
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

	// TODO: get (enumerator) for votes
	// TODO: get (enumerator) for tasks 
}

contract Microcompany is IMicrocompany, Ownable {
	MicrocompanyStorage store;
	StdMicrocompanyToken stdToken;
	address autoActionCallerAddress = 0x0;

	// Constructor
	function Microcompany(MicrocompanyStorage _store) public {
		// TODO: symbol, name, etc...
		stdToken = new StdMicrocompanyToken("StdToken","STDT",18);
		store = _store;

		// 2 - set permissions
		// this is a list of action that any employee can do without voting
		store.addActionByEmployeesOnly("addNewVote");
		store.addActionByEmployeesOnly("startTask");
		store.addActionByEmployeesOnly("startBounty");
		// this is a list of actions that require voting
		store.addActionByVoting("addNewEmployee");
		store.addActionByVoting("addNewTask");
		store.addActionByVoting("issueTokens");

		// 3 - do other preparations
		issueTokensInternal(msg.sender,1000);		// issue all 100% tokens to the creator
		store.addNewEmployee(msg.sender);			// add creator as first employee	
	}

	function setAutoActionCallerAddress(address _a) public onlyOwner {
		autoActionCallerAddress = _a;
	}

	// just an informative modifier
   modifier byVotingOnly(){
		_; 
	}

   modifier isCanDo(string _what){
		require(isCanDoAction(msg.sender,_what)); 
		_; 
	}

// IMicrocompany:
	//
	function addNewVote(address _vote) public { 
		bool isCan = isCanDoAction(msg.sender,"addNewVote") || (msg.sender==autoActionCallerAddress);
		require(isCan);

		store.addNewVote(_vote);
	}

	// this should be called either directly or from the Vote...
	function addNewWeiTask(address _task) public isCanDo("addNewTask") byVotingOnly {
		store.addNewWeiTask(_task);
	}

	function issueTokens(address _to, uint amount)public isCanDo("issueTokens") byVotingOnly {
		// TODO
	}

	// caller should make sure that he is not adding same employee twice
	function addNewEmployee(address _newEmployee) public isCanDo("addNewEmployee") byVotingOnly {
		store.addNewEmployee(_newEmployee);
	}

	function isEmployee(address _a)public constant returns(bool){
		return store.isEmployee(_a);
	}

	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		// 1 - check if employees can do that without voting?
		if(store.isCanDoByEmployee(_permissionName) && isEmployee(_a)){
			return true;
		}

		// 2 - can do action only by starting new vote first?
		if(store.isCanDoByVoting(_permissionName)){
			var (isVotingFound, votingResult) = store.getVotingResults(msg.sender);
			if(isVotingFound){
				return votingResult;
			}
			
			// 3 - only token holders with > 51% of gov.tokens can add new task immediately 
			// otherwise -> start voting
			if(isInMajority(_a)){
				return true;
			}

			return false;
		}

		return false;
	}

// Public (for tests)
	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a) public constant returns(bool){
		// TODO:
		// if we have many tokens -> we should scan all and check if have more than 51% of governance type 

		return(stdToken.balanceOf(_a)>=stdToken.totalSupply()/2);
	}

// Internal:
	function issueTokensInternal(address _to, uint _amount) internal {
		stdToken.mint(_to, _amount);
	}
}

// TODO:
contract AutoActionCaller {
	Microcompany mc;

	function AutoActionCaller(Microcompany _mc)public{
		mc = _mc;
	}

	// experimental...
	function addNewWeiTaskAuto(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public {
		if(mc.isCanDoAction(msg.sender, "addNewTask")){
			// 1 - create new task immediately
			WeiTask wt = new WeiTask(mc, _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			mc.addNewWeiTask(wt);
		}else{
			// 2 - create new vote instead
			VoteAddNewTask vant = new VoteAddNewTask(mc, _caption, _desc, _isPostpaid, _isDonation, _neededWei);
			mc.addNewVote(vant);
		}
	}

	function issueTokensAuto(address _to, uint _amount) public {
		if(mc.isCanDoAction(msg.sender, "issueTokens")){
			// 1 - create new task immediately
			mc.issueTokens(_to, _amount);
		}else{
			// 2 - create new vote instead
			VoteIssueTokens vit = new VoteIssueTokens(mc, _to, _amount);
			mc.addNewVote(vit);		// msg.sender will be AutoActionCaller that has no rights to add votes
		}
	}
}
