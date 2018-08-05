pragma solidity ^0.4.22;

// import "./store.sol";
import "./IDaoBase.sol";

import "./tokens/StdDaoToken.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title DaoBase 
 * @dev This is the base contract that you should use.
 * 
 * 1. This contract will be the owner of the 'store' and all 'tokens' inside the store!
 * It will transfer ownership only during upgrade
 *
 * 2. Currently DaoBase works only with StdDaoToken. It does not support working with 
 * plain ERC20 tokens because we need some extra features like mintFor(), burnFor() and transferOwnership()
*/


contract DaoBase is IDaoBase {
	using DaoLib for DaoLib.DaoStorage;
	DaoLib.DaoStorage store;

	bytes32 constant public ISSUE_TOKENS = 0xe003bf3bc29ae37598e0a6b52d6c5d94b0a53e4e52ae40c01a29cdd0e7816b71;
	bytes32 constant public MANAGE_GROUPS = 0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0b;
	bytes32 constant public ADD_NEW_PROPOSAL = 0x55c7fa9eebcea37770fd33ec28acf7eacb6ea53052a9e9bc0a98169768578c5f;
	bytes32 constant public BURN_TOKENS = 0x324cd2c359ecbc6ad92db8d027aab5d643f27c3055619a49702576797bb41fe5;
	bytes32 constant public UPGRADE_DAO_CONTRACT = 0x3794eb44dffe1fc69d141df1b355cf30d543d8006634dd7a125d0e5f500b7fb1;
	bytes32 constant public REMOVE_GROUP_MEMBER = 0x3a5165e670fb3632ad283cd3622bfca48f4c8202b504a023dafe70df30567075;
	bytes32 constant public WITHDRAW_DONATIONS = 0xfc685f51f68cb86aa29db19c2a8f4e85183375ba55b5e56fb2e89adc5f5e4285;
	bytes32 constant public ALLOW_ACTION_BY_SHAREHOLDER = 0xbeaac974e61895532ee7d8efc953d378116d446667765b57f62c791c37b03c8d;
	bytes32 constant public ALLOW_ACTION_BY_VOTING = 0x2e0b85549a7529dfca5fb20621fe76f393d05d7fc99be4dd3d996c8e1925ba0b;
	bytes32 constant public ALLOW_ACTION_BY_ADDRESS = 0x087dfe531c937a5cbe06c1240d8f791b240719b90fd2a4e453a201ce0f00c176;
	bytes32 constant public ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP = 0xa7889b6adda0a2270859e5c6327f82b987d24f5729de85a5746ce28eed9e0d07;

	constructor(address[] _tokens) public {
		store.libConstructor(_tokens);
	}

	modifier isCanDo(bytes32 _what){
		require(store.isCanDoAction(msg.sender,_what)); 
		_; 
	}

	modifier onlyOwner() {
		require(msg.sender == store.owner);
		_;
	}

	function stringHash(string _s) public pure returns(bytes32) {
		return keccak256(abi.encodePacked(_s));
	}

	function getObserverCount() public view returns(uint) {
		return store.getObserverCount();
	}

	function getObserverAtIndex(uint _index) public view returns(address) {
		return store.getObserverAtIndex(_index);
	}	

	function isCanDoByGroupMember(bytes32 _what, address _a) public view returns(bool) {
		return store.isCanDoByGroupMember(_what, _a);
	}
	// IDaoBase:
	function addObserver(IDaoObserver _observer) public {
		store.addObserver(_observer);
	}

	function easyEditOff() public {
		store.isEasyEdit = false;
	}

	function upgradeDaoContract(IDaoBase _new) public isCanDo(UPGRADE_DAO_CONTRACT) {
		store.upgradeDaoContract(_new);
	}

	// Groups:
	function getMembersCount(string _groupName) public view returns(uint) {
		return store.getMembersCount(stringHash(_groupName));
	}

	function addGroupMember(string _groupName, address _a) public isCanDo(MANAGE_GROUPS) {
		store.addGroupMember(stringHash(_groupName), _a);
	}

	function getGroupMembers(string _groupName) public view returns(address[]) {
		return store.getGroupMembers(stringHash(_groupName));
	}

	function removeGroupMember(string _groupName, address _a) public isCanDo(MANAGE_GROUPS) {
		store.removeGroupMember(stringHash(_groupName), _a);
	}

	function isGroupMember(string _groupName,address _a) public view returns(bool) {
		return store.isGroupMember(stringHash(_groupName), _a);
	}

	function getMemberByIndex(string _groupName, uint _index) public view returns (address) {
		return store.getMemberByIndex(stringHash(_groupName), _index);
	}

// Actions:
	function allowActionByShareholder(bytes32 _what, address _tokenAddress) public isCanDo(MANAGE_GROUPS) {
		store.allowActionByShareholder(_what, _tokenAddress);
	}

	function allowActionByVoting(bytes32 _what, address _tokenAddress) public isCanDo(MANAGE_GROUPS) {
		store.allowActionByVoting(_what,_tokenAddress);
	}

	function allowActionByAddress(bytes32 _what, address _a) public isCanDo(MANAGE_GROUPS) {
		store.allowActionByAddress(_what,_a);
	}

	function allowActionByAnyMemberOfGroup(bytes32 _what, string _groupName) public isCanDo(MANAGE_GROUPS) {
		store.allowActionByAnyMemberOfGroup(_what, stringHash(_groupName));
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
	function isCanDoAction(address _a, bytes32 _permissionNameHash) public view returns(bool) {
		return store.isCanDoAction(_a, _permissionNameHash);
	}

	// Proposals:
	function addNewProposal(IProposal _proposal) public isCanDo(ADD_NEW_PROPOSAL) { 
		store.addNewProposal(_proposal);
	}

	function getProposalAtIndex(uint _i)public view returns(IProposal) {
		return store.getProposalAtIndex(_i);
	}

	function getProposalsCount()public view returns(uint) {
		return store.getProposalsCount();
	}

	// Tokens:
	function issueTokens(address _tokenAddress, address _to, uint _amount)public isCanDo(ISSUE_TOKENS) {
		store.issueTokens(_tokenAddress, _to, _amount);
	}

	function burnTokens(address _tokenAddress, address _who, uint _amount)public isCanDo(BURN_TOKENS) {
		store.burnTokens(_tokenAddress, _who, _amount);	
	}
}

library DaoLib{
	event DaoBase_UpgradeDaoContract(address _new);
	event DaoBase_AddGroupMember(string _groupName, address _a);
	event DaoBase_RemoveGroupMember(address _new);
	event DaoBase_AllowActionByShareholder(bytes32 _what, address _tokenAddress);
	event DaoBase_AllowActionByVoting(bytes32 _what, address _tokenAddress);
	event DaoBase_AllowActionByAddress(bytes32 _what, address _a);
	event DaoBase_AllowActionByAnyMemberOfGroup(bytes32 _what, string _groupName);
	event DaoBase_AddNewProposal(address _proposal);
	event DaoBase_IssueTokens(address _tokenAddress, address _to, uint _amount);
	event DaoBase_BurnTokens(address _tokenAddress, address _who, uint _amount);
	event OwnershipTransferred(address owner, address newOwner);

	bytes32 constant public ISSUE_TOKENS = 0xe003bf3bc29ae37598e0a6b52d6c5d94b0a53e4e52ae40c01a29cdd0e7816b71;
	bytes32 constant public MANAGE_GROUPS = 0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0b;
	bytes32 constant public ADD_NEW_PROPOSAL = 0x55c7fa9eebcea37770fd33ec28acf7eacb6ea53052a9e9bc0a98169768578c5f;
	bytes32 constant public BURN_TOKENS = 0x324cd2c359ecbc6ad92db8d027aab5d643f27c3055619a49702576797bb41fe5;
	bytes32 constant public UPGRADE_DAO_CONTRACT = 0x3794eb44dffe1fc69d141df1b355cf30d543d8006634dd7a125d0e5f500b7fb1;
	bytes32 constant public REMOVE_GROUP_MEMBER = 0x3a5165e670fb3632ad283cd3622bfca48f4c8202b504a023dafe70df30567075;
	bytes32 constant public WITHDRAW_DONATIONS = 0xfc685f51f68cb86aa29db19c2a8f4e85183375ba55b5e56fb2e89adc5f5e4285;
	bytes32 constant public ALLOW_ACTION_BY_SHAREHOLDER = 0xbeaac974e61895532ee7d8efc953d378116d446667765b57f62c791c37b03c8d;
	bytes32 constant public ALLOW_ACTION_BY_VOTING = 0x2e0b85549a7529dfca5fb20621fe76f393d05d7fc99be4dd3d996c8e1925ba0b;
	bytes32 constant public ALLOW_ACTION_BY_ADDRESS = 0x087dfe531c937a5cbe06c1240d8f791b240719b90fd2a4e453a201ce0f00c176;
	bytes32 constant public ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP = 0xa7889b6adda0a2270859e5c6327f82b987d24f5729de85a5746ce28eed9e0d07;

	struct DaoStorage{
		StdDaoToken[] tokens;
		IProposal[] proposals;
		address[] observers;
		mapping (address=>mapping(bytes32=>bool)) byShareholder; // token -> permission -> flag
		mapping (address=>mapping(bytes32=>bool)) byVoting; // token -> permission -> flag
		mapping (address=>mapping(bytes32=>bool)) byAddress; // address -> permission -> flag
		mapping (address=>bytes32[]) addressToGroups; // member -> group names
		mapping (bytes32=>address[]) groupToAddresses; // group name -> members
		mapping (bytes32=>mapping(bytes32=>bool)) isAllowedActionByGroupMember; // group name -> permission -> flag
		address owner;
		bool isEasyEdit;
	}

	function transferOwnership(DaoStorage storage store, address newOwner) public {
		require(msg.sender == store.owner);
		require(newOwner != address(0));
		emit OwnershipTransferred(store.owner, newOwner);
		store.owner = newOwner;
	}

	function libConstructor(DaoStorage storage store, address[] _tokens) public{
		for(uint i=0; i<_tokens.length; ++i) {
			store.tokens.push(StdDaoToken(_tokens[i]));
		}
		store.owner = msg.sender;
		store.isEasyEdit = true;
	}

	function upgradeDaoContract(DaoStorage storage store, IDaoBase _new) public {
		emit DaoBase_UpgradeDaoContract(_new); // call observers.onUpgrade() for all observers		
		for(uint i=0; i<getObserverCount(store); ++i) {
			IDaoObserver(getObserverAtIndex(store, i)).onUpgrade(_new);
		}	
		transferOwnership(store, _new); // transfer ownership of the store (this -> _new)	
		for(i=0; i<getAllTokenAddresses(store).length; ++i) { // transfer ownership of all tokens (this -> _new)
			getAllTokenAddresses(store)[i].transferOwnership(_new);
		}
	}

	function isCanDoAction(DaoStorage storage store, address _a, bytes32 _permissionNameHash) public view returns(bool) {
		// 0 - is can do by address?
		if(store.isEasyEdit){
			return true;
		}

		if(isCanDoByAddress(store, _permissionNameHash, _a)) {
			return true;
		}
		// 1 - check if group member can do that without voting?
		if(isCanDoByGroupMember(store, _permissionNameHash, _a)) {
			return true;
		}
		for(uint i=0; i<getAllTokenAddresses(store).length; ++i) {
			// 2 - check if shareholder can do that without voting?
			if(isCanDoByShareholder(store, _permissionNameHash, getAllTokenAddresses(store)[i]) && 
				(getAllTokenAddresses(store)[i].balanceOf(_a)!=0)) {
				return true;
			}
			// 3 - can do action only by starting new vote first?
			bool isCan = isCanDoByVoting(store, _permissionNameHash, getAllTokenAddresses(store)[i]);
			if(isCan) {
				bool isVotingFound = false;
				bool votingResult = false;
				(isVotingFound, votingResult) = getProposalVotingResults(store, _a);
				if(isVotingFound) {
					// if this action can be done by voting, then Proposal can do this action 
					// from within its context in this case msg.sender is a Voting!
					return votingResult;
				}
				// 4 - only token holders with > 51% of gov.tokens can add new task immediately, otherwise -> start voting
				bool isInMajority = 
					(getAllTokenAddresses(store)[i].balanceOf(_a)) >
					(getAllTokenAddresses(store)[i].totalSupply()/2);
				if(isInMajority) {
					return true;
				}
			}
		}
		return false;
	}

	function issueTokens(DaoStorage storage store, address _tokenAddress, address _to, uint _amount)public {
		emit DaoBase_IssueTokens(_tokenAddress, _to, _amount);
		for(uint i=0; i<getAllTokenAddresses(store).length; ++i) {
			if(getAllTokenAddresses(store)[i]==_tokenAddress) {
				// WARNING: token ownership should be transferred to the current DaoBase to do that!!!
				getAllTokenAddresses(store)[i].mintFor(_to, _amount);
				return;
			}
		}
		revert(); // if not found!
	}

	function burnTokens(DaoStorage storage store, address _tokenAddress, address _who, uint _amount)public {
		emit DaoBase_BurnTokens(_tokenAddress, _who, _amount);
		for(uint i=0; i<getAllTokenAddresses(store).length; ++i) {
			if(getAllTokenAddresses(store)[i]==_tokenAddress){
				// WARNING: token ownership should be transferred to the current DaoBase to do that!!!
				getAllTokenAddresses(store)[i].burnFor(_who, _amount);
				return;
			}
		}
		revert(); // if not found!
	}	

	
	function isGroupMember(DaoStorage storage store, bytes32 _groupName, address _a) public view returns(bool) {
		uint len = store.addressToGroups[_a].length;
		for(uint i=0; i<len; ++i) {
			if(store.addressToGroups[_a][i]==_groupName) {
				return true;
			}
		}
		return false; 
	}

	function stringHash(string _s) public pure returns(bytes32) {
		return keccak256(abi.encodePacked(_s));
	}

	function addGroupMember(DaoStorage storage store, bytes32 _groupHash, address _newMember) public {
		// check if already added 
		require(!isGroupMember(store, _groupHash, _newMember));
		store.addressToGroups[_newMember].push(_groupHash);
		store.groupToAddresses[_groupHash].push(_newMember);
	}

	function getMembersCount(DaoStorage storage store, bytes32 _groupHash) public view returns(uint) {
		return store.groupToAddresses[_groupHash].length;
	}

	function getGroupMembers(DaoStorage storage store, bytes32 _groupHash) public view returns(address[]) {
		return store.groupToAddresses[_groupHash];
	}

	function removeGroupMember(DaoStorage storage store, bytes32 _groupHash, address _member)public {
		require(isGroupMember(store, _groupHash, _member));
		removeParticipantFromGroup(store, _groupHash, _member);
		removeGroupFromMemberGroups(store, _groupHash, _member);
	}

	function getMemberByIndex(DaoStorage storage store, bytes32 _groupHash, uint _index) public view returns(address) {
		require(store.groupToAddresses[_groupHash].length > 0);
		require(store.groupToAddresses[_groupHash].length - 1 >= _index);

		return store.groupToAddresses[_groupHash][_index];
	}

	function getIndexOfAddress(address _item, address[] array)internal pure returns(uint) {
		for(uint j=0; j<array.length; ++j) {
			if(array[j]==_item) {
				return j;
			}
		}
		return array.length;
	}

	function removeParticipantFromGroup(DaoStorage storage store, bytes32 _groupHash, address _member) internal { 
		address[] storage parts = store.groupToAddresses[_groupHash];
		uint index = getIndexOfAddress(_member, parts);
		// if member is not found -> exception
		require(index<parts.length); 
		if(index!=(parts.length - 1)) { 
			parts[index] = parts[parts.length-1];
		}
		// delete last element
		delete parts[parts.length-1]; 
		parts.length--;
		store.groupToAddresses[_groupHash] = parts;
	}

	function getIndexOfBytes32(bytes32 _item, bytes32[] array)internal pure returns(uint) {
		for(uint j=0; j<array.length; ++j) {
			if(array[j]==_item) {
				return j;
			}
		}
		return array.length;
	}

	function removeGroupFromMemberGroups(DaoStorage storage store, bytes32 _groupHash, address _member) internal { 
		bytes32[] storage parts = store.addressToGroups[_member];
		uint index = getIndexOfBytes32(_groupHash, store.addressToGroups[_member]);
		// if member is not found -> exception
		require(index<parts.length); 
		// move last element to the index
		if(index!=(parts.length - 1)){ 
			parts[index] = parts[parts.length-1];
		}
		// delete last element
		delete parts[parts.length-1]; 
		parts.length--;
		store.addressToGroups[_member] = parts;
	}	

	function addObserver(DaoStorage storage store, IDaoObserver _observer) public {
		store.observers.push(_observer);
	}

	function getObserverCount(DaoStorage storage store) public view returns(uint) {
		return store.observers.length;
	}

	function getObserverAtIndex(DaoStorage storage store, uint _index) public view returns(address) {
		return store.observers[_index];
	}

	// Permissions:
	function allowActionByAnyMemberOfGroup(DaoStorage storage store, bytes32 _what, bytes32 _groupName) public {
		store.isAllowedActionByGroupMember[_groupName][_what] = true;
	}

	function isCanDoByGroupMember(DaoStorage storage store, bytes32 _what, address _a /*, bytes32 _groupName*/) public view returns(bool) {
		uint len = store.addressToGroups[_a].length;
		// enumerate all groups that _a belongs to
		for(uint i=0; i<len; ++i){
			bytes32 groupName = store.addressToGroups[_a][i];
			if(store.isAllowedActionByGroupMember[groupName][_what]) {
				return true;
			}
		}
		return false; 
	}

	function allowActionByShareholder(DaoStorage storage store, bytes32 _what, address _tokenAddress) public {
		store.byShareholder[_tokenAddress][_what] = true;
	}

	function allowActionByVoting(DaoStorage storage store, bytes32 _what, address _tokenAddress) public {
		store.byVoting[_tokenAddress][_what] = true;
	}

	function allowActionByAddress(DaoStorage storage store, bytes32 _what, address _a) public {
		store.byAddress[_a][_what] = true;
	}

	function isCanDoByShareholder(DaoStorage storage store, bytes32 _permissionName, address _tokenAddress) public view returns(bool) {
		return store.byShareholder[_tokenAddress][_permissionName];
	}

	function isCanDoByVoting(DaoStorage storage store, bytes32 _permissionName, address _tokenAddress) public view returns(bool) {
		return store.byVoting[_tokenAddress][_permissionName];
	}

	function isCanDoByAddress(DaoStorage storage store, bytes32 _permissionName, address _a) public view returns(bool) {
		return store.byAddress[_a][_permissionName];
	}

	// Vote:
	function addNewProposal(DaoStorage storage store, IProposal _proposal) public {
		store.proposals.push(_proposal);
	}

	function getProposalAtIndex(DaoStorage storage store, uint _i)public view returns(IProposal) {
		require(_i<store.proposals.length);
		return store.proposals[_i];
	}

	function getProposalsCount(DaoStorage storage store) public view returns(uint) {
		return store.proposals.length;
	}

	function getProposalVotingResults(DaoStorage storage store, address _p) public view returns (bool isVotingFound, bool votingResult) {
		// scan all votings and search for the one that is finished
		for(uint i=0; i<store.proposals.length; ++i) {
			if(store.proposals[i]==_p) {
				IVoting voting = store.proposals[i].getVoting();
				return (true, 	voting.isFinished() && voting.isYes());
			}
		}
		return (false,false);
	}

	function getAllTokenAddresses(DaoStorage storage store) public view returns (StdDaoToken[]) {
		return store.tokens;
	}
}