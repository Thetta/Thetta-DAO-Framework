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
contract MicrocompanyBase is IMicrocompanyBase, Ownable {
	StdMicrocompanyToken public stdToken;

	address autoActionCallerAddress = 0x0;

	mapping (uint=>address) proposals;
	uint public proposalsCount = 0;

	mapping (uint=>address) employees;
	uint public employeesCount = 0;

	mapping (string=>bool) byEmployee;
	mapping (string=>bool) byVoting;

//////////////////////
	// Constructor
	function MicrocompanyBase(StdMicrocompanyToken _stdToken) public {
		stdToken = _stdToken;
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

		proposals[proposalsCount] = _proposal;
		proposalsCount++;
	}

	function getProposalAtIndex(uint _i)public constant returns(address){
		require(_i<proposalsCount);
		return proposals[_i];
	}

	function getTokenInfo() public constant returns(address _out){
		return address(stdToken);
	}

	function issueTokens(address _to, uint _amount)public isCanDo("issueTokens") byVotingOnly {
		issueTokensInternal(_to, _amount);
	}

	// caller should make sure that he is not adding same employee twice
	function addNewEmployee(address _newEmployee) public isCanDo("addNewEmployee") byVotingOnly {
		employees[employeesCount] = _newEmployee;
		employeesCount++;
	}

	function removeEmployee(address _employee) public isCanDo("removeEmployee") byVotingOnly {
		// TODO:
	}

	function isEmployee(address _a)public constant returns(bool){
		for(uint i=0; i<employeesCount; ++i){
			if(employees[i]==_a){
				return true;
			}
		}
		return false;
	}

	function getEmployeesCount()public constant returns(uint){
		return employeesCount;
	}

// Permissions:
	// TODO: public
	function addActionByEmployeesOnly(string _what) internal {
		byEmployee[_what] = true;
	}

	function addActionByVoting(string _what) internal {
		byVoting[_what] = true;
	}

	function isCanDoByEmployee(string _permissionName) public constant returns(bool){
		return byEmployee[_permissionName];
	}

	function isCanDoByVoting(string _permissionName) public constant returns(bool){
		return byVoting[_permissionName];
	}

	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		// 1 - check if employees can do that without voting?
		if(isCanDoByEmployee(_permissionName) && isEmployee(_a)){
			return true;
		}

		// 2 - can do action only by starting new vote first?
		if(isCanDoByVoting(_permissionName)){
			var (isVotingFound, votingResult) = getProposalVotingResults(msg.sender);
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

	function getProposalVotingResults(address _p) internal constant returns (bool isVotingFound, bool votingResult){
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


// Public (for tests)
	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a) public constant returns(bool){
		// TODO:
		// if we have many tokens -> we should scan all and check if have more than 51% of governance type 

		return(stdToken.balanceOf(_a)>=stdToken.totalSupply()/2);
	}

	function issueTokensInternal(address _to, uint _amount) internal {
		stdToken.mint(_to, _amount);
	}
}

contract Microcompany is MicrocompanyBase {
	function Microcompany(StdMicrocompanyToken _stdToken) public 
		MicrocompanyBase(_stdToken)
	{
		// 1 - set permissions
		// this is a list of action that any employee can do without voting
		addActionByEmployeesOnly("addNewProposal");
		addActionByEmployeesOnly("startTask");
		addActionByEmployeesOnly("startBounty");

		// this is a list of actions that require voting
		addActionByVoting("addNewEmployee");
		addActionByVoting("removeEmployee");
		addActionByVoting("addNewTask");
		addActionByVoting("issueTokens");

		// add new employee to the company
		addNewEmployee(msg.sender);			// add creator as first employee	
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
