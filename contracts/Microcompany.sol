pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./token/MicrocompanyTokens.sol";
import "./tasks/Tasks.sol";
import "./governance/Voting.sol";

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
contract MicrocompanyStorage is Ownable {
	StdMicrocompanyToken public stdToken;

	mapping (uint=>address) tasks;
	uint public tasksCount = 0;

	mapping (uint=>address) proposals;
	uint public proposalsCount = 0;

	mapping (uint=>address) employees;
	uint public employeesCount = 0;

	mapping (string=>bool) byEmployee;
	mapping (string=>bool) byVoting;

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
	function MicrocompanyStorage(StdMicrocompanyToken _stdToken) public {
		stdToken = _stdToken;
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

	function getProposalVotingResults(address _p) public constant returns (bool isVotingFound, bool votingResult){
		// scan all votings and search for the one that is finished
		for(uint i=0; i<proposalsCount; ++i){
			if(proposals[i]==_p){
				IProposal proposal = IProposal(_p);
				IVoting vote = IVoting(proposal.getVoting());
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

contract Microcompany is IMicrocompanyBase, Ownable {
	address autoActionCallerAddress = 0x0;

	MicrocompanyStorage public store;

//////////////////////
	// Constructor
	function Microcompany(MicrocompanyStorage _store) public {
		// the ownership should be transferred to microcompany
		store = _store;

		// TODO: move to MicrocompanyBuilder

		// 1 - set permissions
		// this is a list of action that any employee can do without voting
		store.addActionByEmployeesOnly("addNewProposal");
		store.addActionByEmployeesOnly("startTask");
		store.addActionByEmployeesOnly("startBounty");

		// this is a list of actions that require voting
		store.addActionByVoting("addNewEmployee");
		store.addActionByVoting("removeEmployee");
		store.addActionByVoting("addNewTask");
		store.addActionByVoting("issueTokens");

		// add new employee to the company
		addNewEmployee(msg.sender);			// add creator as first employee	
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
	function addNewProposal(IProposal _proposal) public { 
		bool isCan = isCanDoAction(msg.sender,"addNewProposal") || (msg.sender==autoActionCallerAddress);
		require(isCan);

		store.addNewProposal(_proposal);
	}

	function getProposalAtIndex(uint _i)public constant returns(address){
		return store.getProposalAtIndex(_i);
	}

	function getProposalsCount()public constant returns(uint){
		return store.proposalsCount();
	}

	function issueTokens(address _to, uint _amount)public isCanDo("issueTokens") byVotingOnly {
		issueTokensInternal(_to, _amount);
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

// Permissions:
	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		// 1 - check if employees can do that without voting?
		if(store.isCanDoByEmployee(_permissionName) && isEmployee(_a)){
			return true;
		}

		// 2 - can do action only by starting new vote first?
		if(store.isCanDoByVoting(_permissionName)){
			var (isVotingFound, votingResult) = store.getProposalVotingResults(msg.sender);
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
		return(store.stdToken().balanceOf(_a)>=store.stdToken().totalSupply()/2);
	}

	function issueTokensInternal(address _to, uint _amount) internal {
		// token ownership should be transferred to the current Microcompany
		store.stdToken().mint(_to, _amount);
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
