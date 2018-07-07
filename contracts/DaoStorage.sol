pragma solidity ^0.4.22;

import "./governance/IProposal.sol";

import "./tokens/StdDaoToken.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title DaoStorageGroupd
 * @dev This contract is used by DaoStorage below. Do not use it directly
*/
contract DaoStorageGroups is Ownable {
	// member -> group names
	mapping (address=>bytes32[]) addressToGroups;
	// group name -> members
	mapping (bytes32=>address[]) groupToAddresses;
	// group name -> permission -> flag
	mapping (bytes32=>mapping(bytes32=>bool)) isAllowedActionByGroupMember;

//////////////////
	function isGroupMember(bytes32 _groupName, address _a) public constant returns(bool){
		uint len = addressToGroups[_a].length;

		for(uint i=0; i<len; ++i){
			if(addressToGroups[_a][i]==_groupName){
				return true;
			}
		}
		return false; 
	}

	function addGroupMember(bytes32 _groupHash, address _newMember) public onlyOwner{
		// check if already added 
		require(!isGroupMember(_groupHash, _newMember));

		addressToGroups[_newMember].push(_groupHash);
		groupToAddresses[_groupHash].push(_newMember);
	}

	function getMembersCount(bytes32 _groupHash) public view returns(uint){
		return groupToAddresses[_groupHash].length;
	}

	function getGroupMembers(bytes32 _groupHash) public view returns(address[]){
		return groupToAddresses[_groupHash];
	}

	function removeGroupMember(bytes32 _groupHash, address _member)public onlyOwner {
		require(isGroupMember(_groupHash, _member));

		removeParticipantFromGroup(_groupHash, _member);
		removeGroupFromMemberGroups(_groupHash, _member);
	}

	function getMemberByIndex(bytes32 _groupHash, uint _index) public view returns(address) {
		require(groupToAddresses[_groupHash].length > 0);
		require(groupToAddresses[_groupHash].length - 1 >= _index);

		return groupToAddresses[_groupHash][_index];
	}

	function getIndexOfAddress(address _item, address[] array)internal pure returns(uint){
		for(uint j=0; j<array.length; ++j){
			if(array[j]==_item){
				return j;
			}
		}
		return array.length;
	}

	function removeParticipantFromGroup(bytes32 _groupHash, address _member) internal { 
		address[] storage parts = groupToAddresses[_groupHash];
		uint index = getIndexOfAddress(_member, parts);

		// if member is not found -> exception
		require(index<parts.length); 

		if(index!=(parts.length - 1)){ 
			parts[index] = parts[parts.length-1];
		}

		// delete last element
		delete parts[parts.length-1]; 
		parts.length--;
		groupToAddresses[_groupHash] = parts;
	}

	function getIndexOfBytes32(bytes32 _item, bytes32[] array)internal pure returns(uint){
		for(uint j=0; j<array.length; ++j){
			if(array[j]==_item){
				return j;
			}
		}
		return array.length;
	}

	function removeGroupFromMemberGroups(bytes32 _groupHash, address _member) internal { 
		bytes32[] storage parts = addressToGroups[_member];
		uint index = getIndexOfBytes32(_groupHash, addressToGroups[_member]);

		// if member is not found -> exception
		require(index<parts.length); 

		// move last element to the index
		if(index!=(parts.length - 1)){ 
			parts[index] = parts[parts.length-1];
		}

		// delete last element
		delete parts[parts.length-1]; 
		parts.length--;
		addressToGroups[_member] = parts;
	}
}

/**
 * @title DaoStorage
 * @dev This is the basic contract that keeps all data. It is used by DaoBase (controller) on top.
 * The controller can be updated but the storage will be kept intact.
 *
 * Storage works with bytes32 instead of strings. DaoBase converts strings to bytes32 by hashing (keccak256)
*/
contract DaoStorage is DaoStorageGroups {
	// owner of DaoStorage will be the Dao (DaoBase)
	// owner of tokens will be the Dao (DaoBase)
	StdDaoToken[] public tokens;
	IProposal[] public proposals;
	address[] public observers;

	// token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byShareholder;
	// token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byVoting;
	// address -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byAddress;

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
	constructor(address[] _tokens) public {
		for(uint i=0; i<_tokens.length; ++i){
			tokens.push(StdDaoToken(_tokens[i]));
		}

		// WARNING: please! do not forget to transfer the token 
		// ownership to the Dao (i.e. DaoBase or any derived contract)
		// Like this:
		//
		// token.transferOwnership(daoBase);
	}

	function addObserver(IDaoObserver _observer) public {
		observers.push(_observer);
	}

	function getObserverCount() external view returns(uint){
		return observers.length;
	}

	function getObserverAtIndex(uint _index) external view returns(address){
		return observers[_index];
	}

// Permissions:
	function allowActionByAnyMemberOfGroup(bytes32 _what, bytes32 _groupName) public onlyOwner {
		isAllowedActionByGroupMember[_groupName][_what] = true;
	}

	function isCanDoByGroupMember(bytes32 _what, address _a /*, bytes32 _groupName*/) public constant returns(bool){
		uint len = addressToGroups[_a].length;

		// enumerate all groups that _a belongs to
		for(uint i=0; i<len; ++i){
			bytes32 groupName = addressToGroups[_a][i];
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
		proposals.push(_proposal);
	}

	function getProposalAtIndex(uint _i)public constant returns(IProposal){
		require(_i<proposals.length);
		return proposals[_i];
	}

	function getProposalsCount()public constant returns(uint){
		return proposals.length;
	}

	function getProposalVotingResults(address _p) public constant returns (bool isVotingFound, bool votingResult){
		// scan all votings and search for the one that is finished
		for(uint i=0; i<proposals.length; ++i){
			if(proposals[i]==_p){
				IVoting voting = proposals[i].getVoting();
				return (true, 	voting.isFinished() && voting.isYes());
			}
		}
		return (false,false);
	}

	function getAllTokenAddresses() public view returns (StdDaoToken[]){
		return tokens;
	}
}
