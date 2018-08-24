pragma solidity ^0.4.22;

import "./IDaoBase.sol";
import "./utils/UtilsLib.sol";

import "./tokens/StdDaoToken.sol";


contract DaoStorage is Ownable {
	StdDaoToken[] public tokens;
	IProposal[] public proposals;
	IDaoObserver[] public observers;
	mapping (address=>mapping(bytes32=>bool)) public actionAvailabilityByShareholder; // token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) public actionAvailabilityByVoting; // token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) public actionAvailabilityByAddress; // address -> permission -> flag
	mapping (bytes32=>mapping(bytes32=>bool)) public actionAvailabilityByMembership; // group name -> permission -> flag
	mapping (address=>bytes32[]) public addressToGroups; // member -> group names
	mapping (bytes32=>address[]) public groupToAddresses; // group name -> members

	constructor(address[] _tokens) public {
		for(uint i = 0; i < _tokens.length; ++i) {
			tokens.push(StdDaoToken(_tokens[i]));
		}
	}

// ------------------ GETTERS
	function isAllowedActionByShareholder(bytes32 _permissionHash, address _tokenAddress) external view returns(bool) {
		return actionAvailabilityByShareholder[_tokenAddress][_permissionHash];	
	}

	function isAllowedActionByVoting(bytes32 _permissionHash, address _tokenAddress) external view returns(bool) {
		return actionAvailabilityByVoting[_tokenAddress][_permissionHash];
	}

	function isAllowedActionByAddress(bytes32 _permissionHash, address _targetAddress) external view returns(bool) {
		return actionAvailabilityByAddress[_targetAddress][_permissionHash];
	}

	function isAllowedActionByMembership(bytes32 _permissionHash, address _targetAddress) external view returns(bool isAllowed) {
		isAllowed = false;
		for(uint i = 0; i < addressToGroups[_targetAddress].length; ++i) {
			bytes32 groupHash = addressToGroups[_targetAddress][i];
			if(actionAvailabilityByMembership[groupHash][_permissionHash]) {
				isAllowed = true;
			}
		}
	}

	function getTokenAtIndex(uint _tokenIndex) external view returns(StdDaoToken) {
		require(_tokenIndex < tokens.length);
		return tokens[_tokenIndex];
	}

	function getProposalAtIndex(uint _proposalIndex) external view returns(IProposal) {
		require(_proposalIndex < proposals.length);
		return proposals[_proposalIndex];
	}

	function getObserverAtIndex(uint _observerIndex) external view returns(IDaoObserver) {
		require(_observerIndex < observers.length);
		return observers[_observerIndex];
	}

	function getTokensCount() external view returns(uint) {
		return tokens.length;
	}

	function getProposalsCount() external view returns(uint) {
		return proposals.length;
	}

	function getObserversCount() external view returns(uint) {
		return observers.length;
	}

	function getAllTokenAddresses() external view returns(StdDaoToken[]) {
		return tokens;
	}

	function getAllProposals() external view returns(IProposal[]) {
		return proposals;
	}

	function getAllObservers() external view returns(IDaoObserver[]) {
		return observers;
	}

	function getGroupsMemberAtIndex(bytes32 _groupHash, uint _memberIndex) public view returns(address) {
		require(_memberIndex < groupToAddresses[_groupHash].length);
		return groupToAddresses[_groupHash][_memberIndex];
	}

	function getMembersGroupAtIndex(address _member, uint _groupIndex) public view returns(bytes32) {
		require(_groupIndex < addressToGroups[_member].length);
		return addressToGroups[_member][_groupIndex];
	}

	function getMembersCount(bytes32 _groupHash) public view returns(uint) {
		return groupToAddresses[_groupHash].length;
	}

	function getMembersGroupCount(address _member) public view returns(uint) {
		return addressToGroups[_member].length;
	}	

	function getGroupMembers(bytes32 _groupHash) public view returns(address[]) {
		return groupToAddresses[_groupHash];
	}

	function getMemberGroups(address _member) public view returns(bytes32[]) {
		return addressToGroups[_member];
	}

	function isGroupMember(bytes32 _groupHash, address _member) public view returns(bool) {
		return UtilsLib.isAddressInArray(groupToAddresses[_groupHash], _member);
	}

// ------------------ SETTERS
	function allowActionByShareholder(bytes32 _permissionHash, address _tokenAddress) external onlyOwner {
		actionAvailabilityByShareholder[_tokenAddress][_permissionHash] = true;
	}

	function allowActionByVoting(bytes32 _permissionHash, address _tokenAddress) external onlyOwner {
		actionAvailabilityByVoting[_tokenAddress][_permissionHash] = true;
	}

	function allowActionByAddress(bytes32 _permissionHash, address _targetAddress) external onlyOwner {
		actionAvailabilityByAddress[_targetAddress][_permissionHash] = true;
	}

	function allowActionByAnyMemberOfGroup(bytes32 _permissionHash, bytes32 _groupHash) external onlyOwner {
		actionAvailabilityByMembership[_groupHash][_permissionHash] = true;
	}

	function addToken(address _token) external onlyOwner {
		tokens.push(StdDaoToken(_token));
	}

	function addProposal(IProposal _proposal) external onlyOwner {
		proposals.push(_proposal);
	}

	function addObserver(IDaoObserver _observer) external {
		observers.push(_observer);
	}

	function addGroupMember(bytes32 _groupHash, address _newMember) external onlyOwner {
		require(!UtilsLib.isAddressInArray(groupToAddresses[_groupHash], _newMember));
		addressToGroups[_newMember].push(_groupHash);
		groupToAddresses[_groupHash].push(_newMember);
	}

//------------------ RESTRICT/REMOVE	

	function restrictActionByShareholder(bytes32 _permissionHash, address _tokenAddress) external onlyOwner {
		actionAvailabilityByShareholder[_tokenAddress][_permissionHash] = false;
	}

	function restrictActionByVoting(bytes32 _permissionHash, address _tokenAddress) external onlyOwner {
		actionAvailabilityByVoting[_tokenAddress][_permissionHash] = false;
	}

	function restrictActionByAddress(bytes32 _permissionHash, address _targetAddress) external onlyOwner {
		actionAvailabilityByAddress[_targetAddress][_permissionHash] = false;
	}

	function restrictActionByGroupMembership(bytes32 _permissionHash, bytes32 _groupHash) external onlyOwner {
		actionAvailabilityByMembership[_groupHash][_permissionHash] = false;
	}

	function removeGroupMember(bytes32 _groupHash, address _member) external onlyOwner {
		require(UtilsLib.isAddressInArray(groupToAddresses[_groupHash], _member));
		require(UtilsLib.isBytes32InArray(addressToGroups[_member], _groupHash));
		UtilsLib.removeBytes32FromArray(addressToGroups[_member], _groupHash);
		UtilsLib.removeAddressFromArray(groupToAddresses[_groupHash], _member);
	}

	function removeProposal(IProposal _proposal) external onlyOwner {
		UtilsLib.removeProposalFromArray(proposals, _proposal);
	}

	function removeObserver(IDaoObserver _observer) external onlyOwner {
		UtilsLib.removeDaoObserverFromArray(observers, _observer);
	}
}
