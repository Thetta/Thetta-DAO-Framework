pragma solidity ^0.4.15;

import "./DaoStorage.sol";

import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

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

	function upgradeDaoContract(IDaoBase _new) public isCanDo("upgradeDaoContract") {
		// call observers.onUpgrade() for all observers
		for(uint i=0; i<store.getObserverCount(); ++i){
			IDaoObserver(store.getObserverAtIndex(i)).onUpgrade(_new);
		}

		store.transferOwnership(_new);
		store.stdToken().transferOwnership(_new);
	}

// Groups:
	function getMembersCount(string _groupName) public constant returns(uint){
		return store.getMembersCount(keccak256(_groupName));
	}
	function getMembersCountByHash(bytes32 _groupHash) public constant returns(uint){
		return store.getMembersCount(_groupHash);
	}
	function addGroup(string _groupName) public isCanDo("manageGroups"){
		store.addGroup(keccak256(_groupName));	
	}
	function addGroupMember(string _groupName, address _a) public isCanDo("manageGroups") {
		store.addGroupMember(keccak256(_groupName), _a);
	}
	function getGroupMembers(string _groupName) public constant returns(address[]){
		return store.getGroupMembers(keccak256(_groupName));
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

// Actions:
	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByShareholder(keccak256(_what), _tokenAddress);
	}
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByVoting(keccak256(_what),_tokenAddress);
	}
	function allowActionByAddress(string _what, address _a) public /*isCanDo("manageGroups")*/{
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
			&& (ERC20(store.stdToken()).balanceOf(_a)!=0))
		{
			return true;
		}

		// 2 - can do action only by starting new vote first?
		// TODO: generalize for ALL tokens!
		bool isCan = store.isCanDoByVoting(_permissionNameHash, address(store.stdToken()));
		if(isCan){
			var (isVotingFound, votingResult) = store.getProposalVotingResults(_a);

			if(isVotingFound){
				// if this action can be done by voting, then Proposal can do this action 
				// from within its context
				// in this case msg.sender is a Voting!
				return votingResult;
			}
			
			// 3 - only token holders with > 51% of gov.tokens can add new task immediately 
			// otherwise -> start voting
			// TODO: generalize for ALL tokens!
			bool isInMajority = (ERC20(store.stdToken()).balanceOf(_a))>(ERC20(store.stdToken()).totalSupply()/2);
			if(isInMajority){
				return true;
			}

			return false;
		}

		return false;
	}

// Proposals:
	function addNewProposal(IProposal _proposal) public isCanDo("addNewProposal") { 
		store.addNewProposal(_proposal);
	}

	function getProposalAtIndex(uint _i)public constant returns(IProposal){
		return store.getProposalAtIndex(_i);
	}

	function getProposalsCount()public constant returns(uint){
		return store.getProposalsCount();
	}

// Tokens:
	function issueTokens(address _to, uint _amount)public isCanDo("issueTokens") {
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
