pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./tasks/Tasks.sol";
import "./governance/Votes.sol";
import "./token/MicrocompanyTokens.sol";
import "./moneyflow/Moneyflow.sol";

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

	mapping (uint=>address) proposals;
	uint public proposalsCount = 0;

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

// Vote:
	// TODO: public
	function addNewProposal(IProposal _proposal) public {
		proposals[proposalsCount] = _proposal;
		proposalsCount++;
	}

	function getProposalAtIndex(uint _i)public constant returns(address){
		require(_i<proposalsCount);
		return proposals[_i];
	}

	// TODO: rename? 
	function getVotingResults(address _vote) public constant returns (bool isVotingFound, bool votingResult){
		// scan all votings and search for the one that is finished 
		for(uint i=0; i<proposalsCount; ++i){
			if(proposals[i]==_vote){
				IVote vote = IVote(proposals[i]);
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

	// TODO: get (enumerator) for proposals 
	// TODO: get (enumerator) for tasks 
}

contract Microcompany is IMicrocompany, Ownable {
	StdMicrocompanyToken public stdToken;
	//MoneyFlow public moneyflow;

	MicrocompanyStorage store;
	address autoActionCallerAddress = 0x0;

	// Constructor
	function Microcompany(MicrocompanyStorage _store, /*MoneyFlow _moneyflow,*/ uint _tokensAmountToIssue) public {
		// TODO: symbol, name, etc...
		stdToken = new StdMicrocompanyToken("StdToken","STDT",18);
		store = _store;

		// TODO: this can be moved to the Bylaws 

		// 2 - set permissions
		// this is a list of action that any employee can do without voting
		store.addActionByEmployeesOnly("addNewProposal");
		store.addActionByEmployeesOnly("startTask");
		store.addActionByEmployeesOnly("startBounty");
		// this is a list of actions that require voting
		store.addActionByVoting("addNewEmployee");
		store.addActionByVoting("removeEmployee");
		store.addActionByVoting("addNewTask");
		store.addActionByVoting("issueTokens");

		// 3 - do other preparations
		// issue all 100% tokens to the creator
		require(0!=_tokensAmountToIssue);			// we need to issue at least 1 token in order for the creator to be 
																// a majority
		issueTokensInternal(msg.sender, _tokensAmountToIssue);		

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
	function addNewProposal(IProposal _proposal) public { 
		bool isCan = isCanDoAction(msg.sender,"addNewProposal") || (msg.sender==autoActionCallerAddress);
		require(isCan);

		store.addNewProposal(_proposal);
	}

	function issueTokens(address _to, uint _amount)public isCanDo("issueTokens") byVotingOnly {
		issueTokensInternal(_to, _amount);
	}

	function getTokenInfo() public constant returns(address _out){
		return address(stdToken);
	}

	// caller should make sure that he is not adding same employee twice
	function addNewEmployee(address _newEmployee) public isCanDo("addNewEmployee") byVotingOnly {
		store.addNewEmployee(_newEmployee);
	}

	function removeEmployee(address _employee) public isCanDo("removeEmployee") byVotingOnly {
		// TODO:
	}

	function isEmployee(address _a)public constant returns(bool){
		return store.isEmployee(_a);
	}

	function getEmployeesCount()public constant returns(uint){
		return store.employeesCount();
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
	// TODO: 
	/*
	function addNewWeiTaskAuto(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public returns(address voteOut){
		WeiTask wt = new WeiTask(mc, _caption, _desc, _isPostpaid, _isDonation, _neededWei);

		if(mc.isCanDoAction(msg.sender, "addNewTask")){
			// 1 - add new task immediately
			mc.addNewWeiTask(wt);
			return 0x0;
		}else{
			// 2 - create new vote instead
			// we pass msg.sender (just like tx.origin) 
			ProposalAddNewTask vant = new ProposalAddNewTask(mc, msg.sender, wt);
			mc.addNewProposal(vant);
			return vant;
		}
	}
	*/

	function issueTokensAuto(address _to, uint _amount) public returns(address voteOut){
		if(mc.isCanDoAction(msg.sender, "issueTokens")){
			// 1 - create new task immediately
			mc.issueTokens(_to, _amount);
			return 0x0;
		}else{
			// 2 - create new vote instead
			// we pass msg.sender (just like tx.origin) 
			ProposalIssueTokens pit = new ProposalIssueTokens(mc, msg.sender, _to, _amount);
			mc.addNewProposal(pit);		
			return pit;
		}
	}
}
