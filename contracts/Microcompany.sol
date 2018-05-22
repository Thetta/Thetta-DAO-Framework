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
// manageGroups
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
//		3. if caller shareholder and this action can be done by shareholder -> allow
//		4. if this action requires voting 
//			a. caller is in the majority -> allow
//			b. caller is voting and it is succeeded -> allow
//		4. deny
contract MicrocompanyStorage is Ownable {
	StdMicrocompanyToken public stdToken;

	mapping (uint=>IProposal) proposals;
	uint public proposalsCount = 0;

	mapping (uint=>address) employees;
	uint public employeesCount = 0;

	address[] observers;

	mapping (string=>bool) byEmployee;
	mapping (string=>bool) byShareholder;
	mapping (string=>bool) byVoting;
	mapping (address=>mapping(string=>bool)) byAddress;

	// name -> members
	mapping (string=>address[]) groups;
	// name -> permission -> flag
	mapping (string=>mapping(string=>bool)) groupPermissions;

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
	function MicrocompanyStorage(StdMicrocompanyToken _stdToken) public {
		stdToken = _stdToken;
	}

	function addObserver(IMicrocompanyObserver _observer) public {
		observers.push(_observer);
	}

// Permissions:
	function addGroup(string _groupName) public onlyOwner{
		// do nothing
	}

	function addGroupMember(string _groupName, address _newMember) public onlyOwner{
		// TODO: check if already added 
		groups[_groupName].push(_newMember);
	}

	function removeGroupMember(string _groupName, address _member)public onlyOwner {
		// TODO:
	}

	function isGroupMember(string _groupName, address _a) public constant returns(bool){
		for(uint i=0; i<groups[_groupName].length; ++i){
			if(groups[_groupName][i]==_a){
				return true;
			}
		}
		return false; 
	}

	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public onlyOwner {
		groupPermissions[_groupName][_what] = true;
	}

	function isCanDoByGroupMember(string _what, string _groupName) public constant returns(bool){
		return groupPermissions[_groupName][_what];
	}

	//////
	// TODO: use _tokenAddress
	function addActionByShareholder(string _what, address _tokenAddress) public onlyOwner {
		byShareholder[_what] = true;
	}

	// TODO: use _tokenAddress
	function allowActionByVoting(string _what, address _tokenAddress) public onlyOwner {
		byVoting[_what] = true;
	}

	function allowActionByAddress(string _what, address _a) public onlyOwner {
		byAddress[_a][_what] = true;
	}

	function isCanDoByShareholder(string _permissionName) public constant returns(bool){
		// TODO: use _tokenAddress 
		// see <addActionBySha> method
		return byShareholder[_permissionName];
	}

	function isCanDoByVoting(string _permissionName) public constant returns(bool,address){
		// TODO: return _tokenAddress instead of 0x0!!!
		// see <allowActionByVoting> method
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
				IVoting voting = proposals[i].getVoting();
				return (true, 	voting.isFinished() && voting.isYes());
			}
		}

		return (false,false);
	}

	function isShareholder(address _a, address _token) public constant returns(bool){
		return (ERC20(_token).balanceOf(_a)!=0);
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
	function addObserver(IMicrocompanyObserver _observer) public {
		store.addObserver(_observer);	
	}

	function upgradeMicrocompanyContract(IMicrocompanyBase _new) public isCanDo("upgradeMicrocompany") {
		store.transferOwnership(_new);
		store.stdToken().transferOwnership(_new);

		// TODO: 
		// call observers.onUpgrade() for all observers
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

	function addGroupMember(string _groupName, address _a) public isCanDo("manageGroups") {
		store.addGroupMember(_groupName, _a);
	}

	function removeGroupMember(string _groupName, address _a) public isCanDo("manageGroups"){
		store.removeGroupMember(_groupName, _a);
	}

	function isGroupMember(string _groupName,address _a)public constant returns(bool) {
		return store.isGroupMember(_groupName, _a);
	}

	function isShareholder(address _a, address _token) public constant returns(bool){
		return store.isShareholder(_a, _token);
	}

// Permissions:
	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		// 0 - is can do by address?
		if(store.isCanDoByAddress(_permissionName, _a)){
			return true;
		}

		// 1 - check if employees can do that without voting?
		// TODO: generalize for ALL groups!
		if(store.isCanDoByGroupMember(_permissionName, "Employees") && store.isGroupMember("Employees", _a)){
			return true;
		}

		// 2 - check if shareholder can do that without voting?
		// TODO: implement this
		// TODO: pass token address
		address someToken = 0x0;
		if(store.isCanDoByShareholder(_permissionName) && isShareholder(_a, someToken)){
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

	function addGroupMemberGeneric(bytes32[] _params) public {
		// TODO: implement
		assert(false);

		/*
		bytes32 _group = bytes32(_params[0]);
		address _emp = address(_params[1]);

		addGroupMember(_group, _emp);
	   */
	}

	function issueTokensGeneric(bytes32[] _params) public {
		address _to = address(_params[0]);
		uint _amount = uint(_params[1]);
		issueTokens(_to, _amount);
	}
}
