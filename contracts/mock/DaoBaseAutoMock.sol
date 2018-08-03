pragma solidity ^0.4.22;

import "../DaoBase.sol";
import "./DaoBaseWithUnpackersMock.sol";

// TODO: convert to library?


/**
 * @title DaoBaseAuto
 * @dev This contract is a helper that will create new Proposal (i.e. voting) if the action is not allowed directly.
 * This should be used with DaoBaseWithUnpackers (not with DaoBase) and is completely optional.
 *
 * WARNING: As long as this contract is just an ordinary DaoBase client -> you should provide permissions to it 
 * just like to any other account/contract. So you should give 'manageGroups', 'issueTokens', etc to the DaoBaseAuto! 
 * Please see 'tests' folder for example.
*/
contract DaoBaseAutoMock {

	IDaoBase dao;

	//bytes32 public constant ISSUE_TOKENS = keccak256(abi.encodePacked("issueTokens"));
	bytes32 constant public ISSUE_TOKENS = 0xe003bf3bc29ae37598e0a6b52d6c5d94b0a53e4e52ae40c01a29cdd0e7816b71;
	//bytes32 public constant MANAGE_GROUPS = keccak256(abi.encodePacked("manageGroups"));
	bytes32 constant public MANAGE_GROUPS = 0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0b;
	//bytes32 public constant UPGRADE_DAO_CONTRACT = keccak256(abi.encodePacked("upgradeDaoContract"));
	bytes32 constant public UPGRADE_DAO_CONTRACT = 0x3794eb44dffe1fc69d141df1b355cf30d543d8006634dd7a125d0e5f500b7fb1;
	//bytes32 public constant REMOVE_GROUP_MEMBER = keccak256(abi.encodePacked("removeGroupMember"));
	bytes32 constant public REMOVE_GROUP_MEMBER = 0x3a5165e670fb3632ad283cd3622bfca48f4c8202b504a023dafe70df30567075;
	//bytes32 public constant ALLOW_ACTION_BY_SHAREHOLDER = keccak256(abi.encodePacked("allowActionByShareholder"));
	bytes32 constant public ALLOW_ACTION_BY_SHAREHOLDER = 0xbeaac974e61895532ee7d8efc953d378116d446667765b57f62c791c37b03c8d;
	//bytes32 public constant ALLOW_ACTION_BY_VOTING = keccak256(abi.encodePacked("allowActionByVoting"));
	bytes32 constant public ALLOW_ACTION_BY_VOTING = 0x2e0b85549a7529dfca5fb20621fe76f393d05d7fc99be4dd3d996c8e1925ba0b;
	//bytes32 public constant ALLOW_ACTION_BY_ADDRESS = keccak256(abi.encodePacked("allowActionByAddress"));
	bytes32 constant public ALLOW_ACTION_BY_ADDRESS = 0x087dfe531c937a5cbe06c1240d8f791b240719b90fd2a4e453a201ce0f00c176;
	//bytes32 public constant ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP = keccak256(abi.encodePacked("allowActionByAnyMemberOfGroup"));
	bytes32 constant public ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP = 0xa7889b6adda0a2270859e5c6327f82b987d24f5729de85a5746ce28eed9e0d07;

	constructor(IDaoBase _dao) public
	{
		dao = _dao;
	}

	function addGroupMemberAuto(string _group, address _a) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(abi.encodePacked(_group)));
		params[1] = bytes32(_a);
		DaoBaseWithUnpackersMock(dao).addGroupMemberGeneric(params);
	   return 0x0;
	}

	function issueTokensAuto(address _token, address _to, uint _amount) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](3);
		params[0] = bytes32(_token);
		params[1] = bytes32(_to);
		params[2] = bytes32(_amount);
		DaoBaseWithUnpackersMock(dao).issueTokensGeneric(params);
	   return 0x0;
	}

	function upgradeDaoContractAuto(address _newMc) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);
		DaoBaseWithUnpackersMock(dao).upgradeDaoContractGeneric(params);
		return 0x0;
	}

	function removeGroupMemberAuto(string _groupName, address _a) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(abi.encodePacked(_groupName)));
		params[1] = bytes32(_a);
		DaoBaseWithUnpackersMock(dao).removeGroupMemberGeneric(params);
		return 0x0;
	}

	function allowActionByShareholderAuto(string _what, address _tokenAddress) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(abi.encodePacked(_what)));
		params[1] = bytes32(_tokenAddress);
		DaoBaseWithUnpackersMock(dao).allowActionByShareholderGeneric(params);
		return 0x0;
	}

	function allowActionByVotingAuto(string _what, address _tokenAddress) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(abi.encodePacked(_what)));
		params[1] = bytes32(_tokenAddress);
		DaoBaseWithUnpackersMock(dao).allowActionByVotingGeneric(params);
		return 0x0;
	}

	function allowActionByAddressAuto(string _what, address _a) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(abi.encodePacked(_what)));
		params[1] = bytes32(_a);
		DaoBaseWithUnpackersMock(dao).allowActionByAddressGeneric(params);
		return 0x0;
	}

	function allowActionByAnyMemberOfGroupAuto(string _what, string _groupName) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(abi.encodePacked(_what)));
		params[1] = bytes32(keccak256(abi.encodePacked(_groupName)));
		DaoBaseWithUnpackersMock(dao).allowActionByAnyMemberOfGroupGeneric(params);
		return 0x0;
	}
}