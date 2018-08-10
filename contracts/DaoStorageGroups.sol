pragma solidity ^0.4.23;

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
	function isGroupMember(bytes32 _groupName, address _a) public view returns(bool) {
		uint len = addressToGroups[_a].length;

		for(uint i=0; i<len; ++i) {
			if(addressToGroups[_a][i]==_groupName) {
				return true;
			}
		}
		return false; 
	}

	function addGroupMember(bytes32 _groupHash, address _newMember) public onlyOwner {
		// check if already added 
		require(!isGroupMember(_groupHash, _newMember));

		addressToGroups[_newMember].push(_groupHash);
		groupToAddresses[_groupHash].push(_newMember);
	}

	function getMembersCount(bytes32 _groupHash) public view returns(uint) {
		return groupToAddresses[_groupHash].length;
	}

	function getGroupMembers(bytes32 _groupHash) public view returns(address[]) {
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

	function getIndexOfAddress(address _item, address[] array)internal pure returns(uint) {
		for(uint j=0; j<array.length; ++j) {
			if(array[j]==_item) {
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

		if(index!=(parts.length - 1)) { 
			parts[index] = parts[parts.length-1];
		}

		// delete last element
		delete parts[parts.length-1]; 
		parts.length--;
		groupToAddresses[_groupHash] = parts;
	}

	function getIndexOfBytes32(bytes32 _item, bytes32[] array)internal pure returns(uint) {
		for(uint j=0; j<array.length; ++j) {
			if(array[j]==_item) {
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