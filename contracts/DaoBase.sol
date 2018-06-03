pragma solidity ^0.4.15;

import "./IDaoBase.sol";

import "./tokens/StdDaoToken.sol";
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
//		2. if caller is in the group and this action can be done by group members -> allow
//		3. if caller is shareholder and this action can be done by a shareholder -> allow
//		4. if this action requires voting 
//			a. caller is in the majority -> allow
//			b. caller is voting and it is succeeded -> allow
//		4. deny
contract DaoStorage is Ownable {
	StdDaoToken public stdToken;

	mapping (uint=>IProposal) proposals;
	uint public proposalsCount = 0;

	address[] public observers;

	// token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byShareholder;
	// token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byVoting;
	// address -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byAddress;

	// member -> group names
	mapping (address=>bytes32[]) groupMembers;
	// group name -> permission -> flag
	mapping (bytes32=>mapping(bytes32=>bool)) isAllowedActionByGroupMember;

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
	function addGroup(bytes32 _groupName) public onlyOwner{
		// do nothing
	}

	function addGroupMember(bytes32 _groupName, address _newMember) public onlyOwner{
		// check if already added 
		require(!isGroupMember(_groupName, _newMember));
		groupMembers[_newMember].push(_groupName);
	}

	function removeGroupMember(bytes32 _groupName, address _member)public onlyOwner {
		// TODO: remove from array like this:
		// delete array[index];
	}

	function isGroupMember(bytes32 _groupName, address _a) public constant returns(bool){
		uint len = groupMembers[_a].length;

		for(uint i=0; i<len; ++i){
			if(groupMembers[_a][i]==_groupName){
				return true;
			}
		}
		return false; 
	}

	function allowActionByAnyMemberOfGroup(bytes32 _what, bytes32 _groupName) public onlyOwner {
		isAllowedActionByGroupMember[_groupName][_what] = true;
	}

	function isCanDoByGroupMember(bytes32 _what, address _a /*, bytes32 _groupName*/) public constant returns(bool){
		uint len = groupMembers[_a].length;

		// enumerate all groups that _a belongs to
		for(uint i=0; i<len; ++i){
			bytes32 groupName = groupMembers[_a][i];
			if(isAllowedActionByGroupMember[groupName][_what]){
				return true;
			}
		}
		return false; 
	}

	//////
	function allowActionByShareholder(bytes32 _what, address _tokenAddress) public onlyOwner {
		byShareholder[_tokenAddress][_what] = true;
	}

	function allowActionByVoting(bytes32 _what, address _tokenAddress) public onlyOwner {
		byVoting[_tokenAddress][_what] = true;
	}

	function allowActionByAddress(bytes32 _what, address _a) public onlyOwner {
		byAddress[_a][_what] = true;
	}

	function isCanDoByShareholder(bytes32 _permissionName, address _tokenAddress) public constant returns(bool){
		return byShareholder[_tokenAddress][_permissionName];
	}

	function isCanDoByVoting(bytes32 _permissionName, address _tokenAddress) public constant returns(bool){
		return byVoting[_tokenAddress][_permissionName];
	}

	function isCanDoByAddress(bytes32 _permissionName, address _a) public constant returns(bool){
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
		store.addGroup(keccak256(_groupName));	
	}
	function addGroupMember(string _groupName, address _a) public isCanDo("manageGroups") {
		store.addGroupMember(keccak256(_groupName), _a);
	}
	function removeGroupMember(string _groupName, address _a) public isCanDo("manageGroups"){
		store.removeGroupMember(keccak256(_groupName), _a);
	}
	function isGroupMember(string _groupName,address _a)public constant returns(bool) {
		return store.isGroupMember(keccak256(_groupName), _a);
	}
	function isGroupMemberByHash(bytes32 _groupNameHash,address _a)public constant returns(bool){
		return store.isGroupMember(_groupNameHash, _a);
	}

	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByShareholder(keccak256(_what), _tokenAddress);
	}
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByVoting(keccak256(_what),_tokenAddress);
	}
	function allowActionByAddress(string _what, address _a) public isCanDo("manageGroups"){
		store.allowActionByAddress(keccak256(_what),_a);
	}
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public isCanDo("manageGroups"){
		store.allowActionByAnyMemberOfGroup(keccak256(_what), keccak256(_groupName));
	}

	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		return isCanDoActionByHash(_a, keccak256(_permissionName));
	}

	function isCanDoActionByHash(address _a, bytes32 _permissionNameHash)public constant returns(bool){
		// 0 - is can do by address?
		if(store.isCanDoByAddress(_permissionNameHash, _a)){
			return true;
		}

		// 1 - check if employees can do that without voting?
	   if(store.isCanDoByGroupMember(_permissionNameHash, _a)){
			return true;
		}

		// 2 - check if shareholder can do that without voting?
		// TODO: generalize for ALL tokens!
		if(store.isCanDoByShareholder(_permissionNameHash, address(store.stdToken()))
			&& isShareholder(_a, address(store.stdToken())))
		{
			return true;
		}

		// 2 - can do action only by starting new vote first?
		// TODO: generalize for ALL tokens!
		bool isCan = store.isCanDoByVoting(_permissionNameHash, address(store.stdToken()));
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
			// TODO: generalize for ALL tokens!
			if(isInMajority(_a, address(store.stdToken()))){
				return true;
			}

			return false;
		}

		return false;
	}

	function upgradeDaoContract(IDaoBase _new) public isCanDo("upgradeDaoContract") {
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
		return (ERC20(_token).balanceOf(_a)!=0);
	}

	// only token holders with > 51% of gov.tokens can add new task immediately 
	function isInMajority(address _a, address _tokenAddress) public constant returns(bool){
		return (ERC20(_tokenAddress).balanceOf(_a))>=(ERC20(_tokenAddress).totalSupply()/2);
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
		bytes32 group = bytes32(_params[0]);
		address a = address(_params[1]);

		// direct call to storage here, instead of calling DaoBase.addGroupMember(string, address);
		store.addGroupMember(keccak256(group), a);
	}

	function issueTokensGeneric(bytes32[] _params) public {
		address _to = address(_params[0]);
		uint _amount = uint(_params[1]);
		issueTokens(_to, _amount);
	}

	// TODO: add other methods:
	/*
	function addGroup(string _groupName) public isCanDo("manageGroups")
	function removeGroupMember(string _groupName, address _a) public isCanDo("manageGroups"){
	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
	function allowActionByAddress(string _what, address _a) public isCanDo("manageGroups"){
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public isCanDo("manageGroups"){
   */
}
