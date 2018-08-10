pragma solidity ^0.4.22;

import "./IDaoObserver.sol";
import "./governance/IProposal.sol";

/**
 * @title This is the base interface that you should use.
 * @dev Derive your DAO from it and provide the method implementation or 
 * see DaoBase contract that implements it.
 */
contract IDaoBase {
	function addObserver(IDaoObserver _observer)public;
	function upgradeDaoContract(IDaoBase _new)public;

// Groups
	function addGroupMember(string _groupName, address _a) public;
	function removeGroupMember(string _groupName, address _a) public;
	function getMembersCount(string _groupName) public view returns(uint);
	function isGroupMember(string _groupName,address _a)public view returns(bool);
	function getMemberByIndex(string _groupName, uint _index) public view returns (address);

// Permissions
	function allowActionByShareholder(bytes32 _what, address _tokenAddress) public;
	function allowActionByVoting(bytes32 _what, address _tokenAddress) public;
	function allowActionByAddress(bytes32 _what, address _a) public;
	function allowActionByAnyMemberOfGroup(bytes32 _what, string _groupName) public;

	function isCanDoAction(address _a, bytes32 _permissionName)public view returns(bool);

// Tokens
	// ???? TODO: needed
	//function addTokenAddressToList();
	function issueTokens(address _tokenAddress, address _to, uint amount)public;
	function burnTokens(address _tokenAddress, address _who, uint amount)public;

// Governance/Proposals
	function addNewProposal(IProposal _proposal) public;
	function getProposalAtIndex(uint _i)public view returns(IProposal);
	function getProposalsCount()public view returns(uint);
}