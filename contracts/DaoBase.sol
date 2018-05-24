pragma solidity ^0.4.15;

import "./IDaoBase.sol";

import "./token/StdDaoToken.sol";
import "./governance/Voting.sol";

import "./tasks/Tasks.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////////
// Permissions:
// 
// addNewProposal
// manageGroups
// issueTokens
// upgradeDao
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
contract DaoStorage is Ownable {
	StdDaoToken public stdToken;

	mapping (uint=>IProposal) proposals;
	uint public proposalsCount = 0;

	mapping (uint=>address) employees;
	uint public employeesCount = 0;

	address[] public observers;

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
	function DaoStorage(StdDaoToken _stdToken) public {
		stdToken = _stdToken;
	}

	function addObserver(IDaoObserver _observer) public {
		observers.push(_observer);
	}

	function getObserverCount() constant returns(uint){
		return observers.length;
	}

	function getObserverAtIndex(uint _index) constant returns(address){
		return observers[_index];
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
	function allowActionByShareholder(string _what, address _tokenAddress) public onlyOwner {
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

contract DaoBase is IDaoBase, Ownable {
	DaoStorage public store;

//////////////////////
	// Constructor
	function DaoBase(DaoStorage _store) public {
		// the ownership should be transferred to microcompany
		store = _store;
	}

	modifier isCanDo(string _what){
		require(isCanDoAction(msg.sender,_what)); 
		_; 
	}

// IDaoBase:
	function addObserver(IDaoObserver _observer) public {
		store.addObserver(_observer);	
	}

	function addGroup(string _groupName) public isCanDo("manageGroups"){
		store.addGroup(_groupName);	
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

	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByShareholder(_what, _tokenAddress);
	}
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByVoting(_what,_tokenAddress);
	}
	function allowActionByAddress(string _what, address _a) public isCanDo("manageGroups"){
		store.allowActionByAddress(_what,_a);
	}

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

	function upgradeDaoContract(IDaoBase _new) public isCanDo("upgradeDao") {
		// call observers.onUpgrade() for all observers
		for(uint i=0; i<store.getObserverCount(); ++i){
			IDaoObserver(store.getObserverAtIndex(i)).onUpgrade(_new);
		}

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

// Public (for tests)
	function isShareholder(address _a, address _token) public constant returns(bool){
		// TODO: use _tokenAddress
		return store.isShareholder(_a, _token);
	}

	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a, address _tokenAddress) public constant returns(bool){
		// TODO: use _tokenAddress
		return(store.stdToken().balanceOf(_a)>=store.stdToken().totalSupply()/2);
	}

	function issueTokensInternal(address _to, uint _amount) internal {
		// token ownership should be transferred to the current DaoBase
		store.stdToken().mint(_to, _amount);
	}
}

contract DaoBaseWithUnpackers is DaoBase {
	function DaoBaseWithUnpackers(DaoStorage _store) public 
		DaoBase(_store)	
	{
	}

	function upgradeDaoContractGeneric(bytes32[] _params) public {
		IDaoBase _b = IDaoBase(address(_params[0]));
		upgradeDaoContract(_b);
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
