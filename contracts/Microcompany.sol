pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./token/MicrocompanyTokens.sol";
import "./governance/Voting.sol";

import "./tasks/Tasks.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////////
// Permissions:
// 
// addNewProposal
// addNewEmployee
// removeEmployee
// issueTokens
// upgradeMicrocompany
//
// Tasks:
//		startTask
//		startBounty
//		addNewTask
//
// Moneyflow:
//		modifyMoneyscheme
//		withdrawDonations
//
// How permissions works now:
//		1. if caller is in the whitelist -> allow
//		2. if caller is employee and this action can be done by employee -> allow
//		3. if this action requires voting 
//			a. caller is in the majority -> allow
//			b. caller is voting and it is succeeded -> allow
//		4. deny
contract MicrocompanyStorage is Ownable {
	StdMicrocompanyToken public stdToken;

	mapping (uint=>IProposal) proposals;
	uint public proposalsCount = 0;

	mapping (uint=>address) employees;
	uint public employeesCount = 0;

	mapping (string=>bool) byEmployee;
	mapping (string=>bool) byVoting;
	mapping (address=>mapping(string=>bool)) byAddress;

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
	function MicrocompanyStorage(StdMicrocompanyToken _stdToken) public {
		stdToken = _stdToken;
	}

// Permissions:
	function addActionByEmployeesOnly(string _what) public onlyOwner {
		byEmployee[_what] = true;
	}

	// TODO: use _tokenAddress
	function addActionByVoting(string _what, address _tokenAddress) public onlyOwner {
		byVoting[_what] = true;
	}

	function addActionByAddress(string _what, address _a) public onlyOwner {
		byAddress[_a][_what] = true;
	}

	function isCanDoByEmployee(string _permissionName) public constant returns(bool){
		return byEmployee[_permissionName];
	}

	function isCanDoByVoting(string _permissionName) public constant returns(bool,address){
		// TODO: return _tokenAddress instead of 0x0!!!
		// see <addActionByVoting> method
		return (byVoting[_permissionName], 0x0);
	}

	function isCanDoByAddress(string _permissionName, address _a) public constant returns(bool){
		return byAddress[_a][_permissionName];
	}

// Vote:
	function addNewProposal(IProposal _proposal) public onlyOwner {
		proposals[proposalsCount] = _proposal;
		proposalsCount++;
	}

	function getProposalAtIndex(uint _i)public constant returns(IProposal){
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
	function addNewEmployee(address _newEmployee) onlyOwner public {
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
}

contract Microcompany is IMicrocompanyBase, Ownable {
	MicrocompanyStorage public store;

//////////////////////
	// Constructor
	function Microcompany(MicrocompanyStorage _store) public {
		// the ownership should be transferred to microcompany
		store = _store;
	}

	modifier isCanDo(string _what){
		require(isCanDoAction(msg.sender,_what)); 
		_; 
	}

// IMicrocompany:
	function upgradeMicrocompanyContract(IMicrocompanyBase _new) public isCanDo("upgradeMicrocompany") {
		store.transferOwnership(_new);
		store.stdToken().transferOwnership(_new);
	}

	function addNewProposal(IProposal _proposal) public isCanDo("addNewProposal") { 
		store.addNewProposal(_proposal);
	}

	function getProposalAtIndex(uint _i)public constant returns(IProposal){
		return store.getProposalAtIndex(_i);
	}

	function getProposalsCount()public constant returns(uint){
		return store.proposalsCount();
	}

	function issueTokens(address _to, uint _amount)public isCanDo("issueTokens") {
		issueTokensInternal(_to, _amount);
	}

	// caller should make sure that he is not adding same employee twice
	function addNewEmployee(address _newEmployee) public isCanDo("addNewEmployee") {
		store.addNewEmployee(_newEmployee);
	}

	function removeEmployee(address _employee) public isCanDo("removeEmployee") {
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
		// 0 - is can do by address?
		if(store.isCanDoByAddress(_permissionName, _a)){
			return true;
		}

		// 1 - check if employees can do that without voting?
		if(store.isCanDoByEmployee(_permissionName) && isEmployee(_a)){
			return true;
		}

		// 2 - can do action only by starting new vote first?
		var (isCan, tokenAddressForVoting) = store.isCanDoByVoting(_permissionName);
		if(isCan){
			var (isVotingFound, votingResult) = store.getProposalVotingResults(msg.sender);
			if(isVotingFound){
				// if this action can be done by voting, then Proposal can do this action 
				// from within its context
				// in this case msg.sender is a Voting!
				return votingResult;
			}
			
			// 3 - only token holders with > 51% of gov.tokens can add new task immediately 
			// otherwise -> start voting
			if(isInMajority(_a, tokenAddressForVoting)){
				return true;
			}

			return false;
		}

		return false;
	}

// Public (for tests)
	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a, address _tokenAddress) public constant returns(bool){
		// TODO: use _tokenAddress

		return(store.stdToken().balanceOf(_a)>=store.stdToken().totalSupply()/2);
	}

	function issueTokensInternal(address _to, uint _amount) internal {
		// token ownership should be transferred to the current Microcompany
		store.stdToken().mint(_to, _amount);
	}
}

contract MicrocompanyWithUnpackers is Microcompany {
	function MicrocompanyWithUnpackers(MicrocompanyStorage _store) public 
		Microcompany(_store)	
	{
	}

	function upgradeMicrocompanyContractGeneric(bytes32[] _params) public {
		IMicrocompanyBase _b = IMicrocompanyBase(address(_params[0]));
		upgradeMicrocompanyContract(_b);
	}

	function addNewEmployeeGeneric(bytes32[] _params) public {
		address _emp = address(_params[0]);
		addNewEmployee(_emp);
	}

	function removeEmployeeGeneric(bytes32[] _params) public {
		address _emp = address(_params[0]);
		removeEmployee(_emp);
	}

	function issueTokensGeneric(bytes32[] _params) public {
		address _to = address(_params[0]);
		uint _amount = uint(_params[1]);
		issueTokens(_to, _amount);
	}
}
