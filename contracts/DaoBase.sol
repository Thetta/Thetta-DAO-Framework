pragma solidity ^0.4.22;

import "./DaoStorage.sol";

import "./tokens/StdDaoToken.sol";

import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title DaoBase 
 * @dev This is the base contract that you should use.
 * 
 * 1. This contract will be the owner of the 'store' and all 'tokens' inside the store!
 * It will transfer ownership only during upgrade
 *
 * 2. Currently DaoBase works only with StdDaoToken. It does not support working with 
 * plain ERC20 tokens because we need some extra features like mint(), burn() and transferOwnership()
*/
contract DaoBase is IDaoBase, Ownable {
	DaoStorage public store;
	
	event DaoBase_UpgradeDaoContract(address _new);
	event DaoBase_AddGroupMember(string _groupName, address _a);
	event DaoBase_RemoveGroupMember(address _new);
	event DaoBase_AllowActionByShareholder(string _what, address _tokenAddress);
	event DaoBase_AllowActionByVoting(string _what, address _tokenAddress);
	event DaoBase_AllowActionByAddress(string _what, address _a);
	event DaoBase_AllowActionByAnyMemberOfGroup(string _what, string _groupName);
	event DaoBase_AddNewProposal(address _proposal);
	event DaoBase_IssueTokens(address _tokenAddress, address _to, uint _amount);
	event DaoBase_BurnTokens(address _tokenAddress, address _who, uint _amount);

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
		require(_isCanDoAction(msg.sender,_what)); 
		_; 
	}

// IDaoBase:
	function addObserver(IDaoObserver _observer) external {
		store.addObserver(_observer);	
	}

	function upgradeDaoContract(IDaoBase _new) external isCanDo("upgradeDaoContract") {
		_upgradeDaoContract(_new);
	}

	function _upgradeDaoContract(IDaoBase _new) internal{	
		emit DaoBase_UpgradeDaoContract(_new);
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
	function getMembersCount(string _groupName) external constant returns(uint){
		return store.getMembersCount(keccak256(_groupName));
	}
	function addGroupMember(string _groupName, address _a) external isCanDo("manageGroups") {
		emit DaoBase_AddGroupMember(_groupName, _a);
		store.addGroupMember(keccak256(_groupName), _a);
	}
	function getGroupMembers(string _groupName) external constant returns(address[]){
		return store.getGroupMembers(keccak256(_groupName));
	}
	function removeGroupMember(string _groupName, address _a) external isCanDo("manageGroups"){
		emit DaoBase_RemoveGroupMember(_a);
		store.removeGroupMember(keccak256(_groupName), _a);
	}
	function isGroupMember(string _groupName,address _a)external constant returns(bool) {
		return store.isGroupMember(keccak256(_groupName), _a);
	}

// Actions:
	function allowActionByShareholder(string _what, address _tokenAddress) external isCanDo("manageGroups"){
		emit DaoBase_AllowActionByShareholder(_what, _tokenAddress);
		store.allowActionByShareholder(keccak256(_what), _tokenAddress);
	}
	function allowActionByVoting(string _what, address _tokenAddress) external isCanDo("manageGroups"){
		emit DaoBase_AllowActionByVoting(_what, _tokenAddress);
		store.allowActionByVoting(keccak256(_what),_tokenAddress);
	}
	function allowActionByAddress(string _what, address _a) external isCanDo("manageGroups") {
		emit DaoBase_AllowActionByAddress(_what, _a);
		store.allowActionByAddress(keccak256(_what),_a);
	}
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) external isCanDo("manageGroups"){
		emit DaoBase_AllowActionByAnyMemberOfGroup(_what, _groupName);
		store.allowActionByAnyMemberOfGroup(keccak256(_what), keccak256(_groupName));
	}

	/**
	 * @dev Function that will check if action is DIRECTLY callable by msg.sender (account or another contract)
	 * How permissions works now:
	 * 1. if caller is in the whitelist -> allow
	 * 2. if caller is in the group and this action can be done by group members -> allow
	 * 3. if caller is shareholder and this action can be done by a shareholder -> allow
	 * 4. if this action requires voting 
	 *    a. caller is in the majority -> allow
	 *    b. caller is voting and it is succeeded -> allow
	 * 4. deny
	*/

	function isCanDoAction(address _a, string _permissionName) external constant returns(bool){
		return _isCanDoAction(_a, _permissionName);
	}

	function _isCanDoAction(address _a, string _permissionName) internal constant returns(bool){
		bytes32 _permissionNameHash = keccak256(_permissionName);

		// 0 - is can do by address?
		if(store.isCanDoByAddress(_permissionNameHash, _a)){
			return true;
		}

		// 1 - check if group member can do that without voting?
	   if(store.isCanDoByGroupMember(_permissionNameHash, _a)){
			return true;
		}

		for(uint i=0; i<store.getAllTokenAddresses().length; ++i){

			// 2 - check if shareholder can do that without voting?
			if(store.isCanDoByShareholder(_permissionNameHash, store.getAllTokenAddresses()[i]) && 
				(store.getAllTokenAddresses()[i].balanceOf(_a)!=0)){
				return true;
			}
			

			// 3 - can do action only by starting new vote first?
			bool isCan = store.isCanDoByVoting(_permissionNameHash, store.getAllTokenAddresses()[i]);
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
				bool isInMajority = 
					(store.getAllTokenAddresses()[i].balanceOf(_a)) >
					(store.getAllTokenAddresses()[i].totalSupply()/2);
				if(isInMajority){
					return true;
				}
			}
		}

		return false;
	}

// Proposals:
	function addNewProposal(IProposal _proposal) external isCanDo("addNewProposal") { 
		emit DaoBase_AddNewProposal(address(_proposal));
		store.addNewProposal(_proposal);
	}

	function getProposalAtIndex(uint _i)external constant returns(IProposal){
		return store.getProposalAtIndex(_i);
	}

	function getProposalsCount()external constant returns(uint){
		return store.getProposalsCount();
	}

// Tokens:
	function issueTokens(address _tokenAddress, address _to, uint _amount)external isCanDo("issueTokens") {
		_issueTokens(_tokenAddress,_to,_amount);
	}

	function _issueTokens(address _tokenAddress, address _to, uint _amount)internal{
		emit DaoBase_IssueTokens(_tokenAddress, _to, _amount);
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

	function burnTokens(address _tokenAddress, address _who, uint _amount)external isCanDo("burnTokens"){
		emit DaoBase_BurnTokens(_tokenAddress, _who, _amount);

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

/**
 * @title DaoBaseWithUnpackers
 * @dev Use this contract instead of DaoBase if you need DaoBaseAuto.
 * It features method unpackers that will convert bytes32[] params to the method params.
 *
 * When DaoBaseAuto will creates voting/proposal -> it packs params into the bytes32[] 
 * After voting is finished -> target method is called and params should be unpacked
*/
contract DaoBaseWithUnpackers is DaoBase {
	constructor(DaoStorage _store) public 
		DaoBase(_store)	
	{
	}

	function upgradeDaoContractGeneric(bytes32[] _params) external {
		IDaoBase _b = IDaoBase(address(_params[0]));
		_upgradeDaoContract(_b);
	}

	function addGroupMemberGeneric(bytes32[] _params) external {
		bytes32 group = bytes32(_params[0]);
		address a = address(_params[1]);

		// direct call to storage here, instead of calling DaoBase.addGroupMember(string, address);
		store.addGroupMember(group, a);
	}

	function issueTokensGeneric(bytes32[] _params) external {
		address _tokenAddress = address(_params[0]);
		address _to = address(_params[1]);
		uint _amount = uint(_params[2]);

		_issueTokens(_tokenAddress, _to, _amount);
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
