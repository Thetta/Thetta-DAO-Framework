pragma solidity ^0.4.22;

import "../DaoBase.sol";
import "./DaoBaseWithUnpackersMock.sol";

// TODO: remove this contract and use DaoBaseAuto instead!
contract DaoBaseAutoMock {
	IDaoBase dao;
	
	constructor(IDaoBase _dao) public {
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