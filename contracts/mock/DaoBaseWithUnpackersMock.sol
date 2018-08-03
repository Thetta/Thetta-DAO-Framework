pragma solidity ^0.4.22;

import "../DaoStorage.sol";
import "../DaoBase.sol";
import "../IDaoBase.sol";
import "../utils/ConversionLib.sol";

contract DaoBaseWithUnpackersMock is DaoBaseWithUnpackers {
	IDaoBase public b;
	bytes32 public group;
	address public a;
	address public member;
	address public tokenAddress;
	uint public amount;
	string public groupName;

	constructor(DaoStorage _store) public 
		DaoBaseWithUnpackers(_store)
	{
	}

	function upgradeDaoContractGeneric(bytes32[] _params) external {
		IDaoBase _b = IDaoBase(address(_params[0]));
		b = _b;
	}

	function addGroupMemberGeneric(bytes32[] _params) external {
		group = bytes32(_params[0]);
		member = address(_params[1]);
	}

	function issueTokensGeneric(bytes32[] _params) external {
		tokenAddress = address(_params[0]);
		a = address(_params[1]);
		amount = uint(_params[2]);
	}

	function removeGroupMemberGeneric(bytes32[] _params) external {
		groupName = ConversionLib.bytes32ToString(_params[0]);
		a = address(_params[1]);
	}

	function allowActionByShareholderGeneric(bytes32[] _params) external {
		group = bytes32(_params[0]);
		a = address(_params[1]);
	}

	function allowActionByVotingGeneric(bytes32[] _params) external {
		group = bytes32(_params[0]);
		a = address(_params[1]);
	}

	function allowActionByAddressGeneric(bytes32[] _params) external {
		group = bytes32(_params[0]);
		a = address(_params[1]);
	}
 
	function allowActionByAnyMemberOfGroupGeneric(bytes32[] _params) external {
		group = bytes32(_params[0]);
		groupName = ConversionLib.bytes32ToString(_params[1]);
	}

}
