pragma solidity ^0.4.22;

import "./DaoStorage.sol";

import "./tokens/StdDaoToken.sol";

import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// READ THIS:
// 1. This contract will be the owner of the 'store' and all 'tokens' inside the store!
// It will transfer ownership only during upgrade
//
// 2. Currently DaoBase works only with StdDaoToken. It does not support working with 
// plain ERC20 tokens because we need some extra features like mint(), burn() and transferOwnership()
contract DaoBase is IDaoBase, Ownable {
	DaoStorage public store;

	constructor(DaoStorage _store) public {
		store = _store;

		// WARNING: please! do not forget to transfer the store
		// ownership to the Dao (this contract)
		// Like this:
		// 
		// store.transferOwnership(daoBase);

		// WARNING: please! do not forget to transfer all tokens'
		// ownership to the Dao (i.e. DaoBase or any derived contract)
		// Like this:
		//
		// token.transferOwnership(daoBase);
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

		// transfer ownership of the store (this -> _new)
		store.transferOwnership(_new);

		// transfer ownership of all tokens (this -> _new)
		for(i=0; i<store.getAllTokenAddresses().length; ++i){
			store.getAllTokenAddresses()[i].transferOwnership(_new);
		}
	}

// Groups:
	function getMembersCount(string _groupName) public constant returns(uint){
		return store.getMembersCount(keccak256(_groupName));
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

// Actions:
	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByShareholder(keccak256(_what), _tokenAddress);
	}
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
		store.allowActionByVoting(keccak256(_what),_tokenAddress);
	}
	function allowActionByAddress(string _what, address _a) public isCanDo("manageGroups") {
		store.allowActionByAddress(keccak256(_what),_a);
	}
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public isCanDo("manageGroups"){
		store.allowActionByAnyMemberOfGroup(keccak256(_what), keccak256(_groupName));
	}

	function isCanDoAction(address _a, string _permissionName) public constant returns(bool){
		bytes32 _permissionNameHash = keccak256(_permissionName);

		// 0 - is can do by address?
		if(store.isCanDoByAddress(_permissionNameHash, _a)){
			return true;
		}

		// 1 - check if employees can do that without voting?
	   if(store.isCanDoByGroupMember(_permissionNameHash, _a)){
			return true;
		}

		for(uint i=0; i<store.getAllTokenAddresses().length; ++i){
			StdDaoToken t = store.getAllTokenAddresses()[i];

			// 2 - check if shareholder can do that without voting?
			if(store.isCanDoByShareholder(_permissionNameHash, t) && (t.balanceOf(_a)!=0)){
				return true;
			}

			// 3 - can do action only by starting new vote first?
			bool isCan = store.isCanDoByVoting(_permissionNameHash, t);
			if(isCan){
				bool isVotingFound = false;
				bool votingResult = false;
				(isVotingFound, votingResult) = store.getProposalVotingResults(_a);

				if(isVotingFound){
					// if this action can be done by voting, then Proposal can do this action 
					// from within its context
					// in this case msg.sender is a Voting!
					return votingResult;
				}
				
				// 4 - only token holders with > 51% of gov.tokens can add new task immediately 
				// otherwise -> start voting
				bool isInMajority = (t.balanceOf(_a))>(t.totalSupply()/2);
				if(isInMajority){
					return true;
				}
			}
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
	function issueTokens(address _tokenAddress, address _to, uint _amount)public isCanDo("issueTokens") {
		for(uint i=0; i<store.getAllTokenAddresses().length; ++i){
			if(store.getAllTokenAddresses()[i]==_tokenAddress){
				// WARNING:
				// token ownership should be transferred to the current DaoBase to do that!!!
				store.getAllTokenAddresses()[i].mint(_to, _amount);
				return;
			}
		}

		// if not found!
		revert();
	}

	function burnTokens(address _tokenAddress, address _who, uint _amount)public isCanDo("burnTokens"){
		for(uint i=0; i<store.getAllTokenAddresses().length; ++i){
			if(store.getAllTokenAddresses()[i]==_tokenAddress){
				// WARNING:
				// token ownership should be transferred to the current DaoBase to do that!!!
				store.getAllTokenAddresses()[i].burn(_who, _amount);
				return;
			}
		}

		// if not found!
		revert();
	}
}

contract DaoBaseWithUnpackers is DaoBase {
	constructor(DaoStorage _store) public 
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
		address _tokenAddress = address(_params[0]);
		address _to = address(_params[1]);
		uint _amount = uint(_params[2]);

		issueTokens(_tokenAddress, _to, _amount);
	}

	// TODO: add other methods:
	/*
	function removeGroupMember(string _groupName, address _a) public isCanDo("manageGroups"){
	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
	function allowActionByAddress(string _what, address _a) public isCanDo("manageGroups"){
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public isCanDo("manageGroups"){
   */
}
