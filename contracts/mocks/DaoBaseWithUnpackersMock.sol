pragma solidity ^0.4.22;

import "../DaoBaseWithUnpackers.sol";

contract DaoBaseWithUnpackersMock is DaoBaseWithUnpackers {

	address public paramAddress1;
	address public paramAddress2;
	string public paramString1;
	uint public paramUint1;
	bytes32 public paramBytes1;

	constructor(DaoStorage _store) public 
		DaoBaseWithUnpackers(_store)
	{
	}

	function upgradeDaoContractGeneric(bytes32[] _params) external {
		paramAddress1 = IDaoBase(address(_params[0]));
	}

	function addGroupMemberGeneric(bytes32[] _params) external {
		paramString1 = UtilsLib.bytes32ToString(_params[0]);
		paramAddress1 = address(_params[1]);
	}

	function issueTokensGeneric(bytes32[] _params) external {
		paramAddress1 = address(_params[0]);
		paramAddress2 = address(_params[1]);
		paramUint1 = uint(_params[2]);
	}

	function removeGroupMemberGeneric(bytes32[] _params) external {
		paramString1 = UtilsLib.bytes32ToString(_params[0]);
		paramAddress1 = address(_params[1]);
	}

	function allowActionByShareholderGeneric(bytes32[] _params) external {
		paramBytes1 = bytes32(_params[0]);
		paramAddress1 = address(_params[1]);
	}

	function allowActionByVotingGeneric(bytes32[] _params) external {
		paramBytes1 = bytes32(_params[0]);
		paramAddress1 = address(_params[1]);
	}

	function allowActionByAddressGeneric(bytes32[] _params) external {
		paramBytes1 = bytes32(_params[0]);
		paramAddress1 = address(_params[1]);
	}

	function allowActionByAnyMemberOfGroupGeneric(bytes32[] _params) external {
		paramBytes1 = bytes32(_params[0]);
		paramString1 = UtilsLib.bytes32ToString(_params[1]);
	}
}