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

	function upgradeDaoContract(IDaoBase _b) public {
		b = _b;
	}

	function addGroupMember(bytes32 _group, address _a) public {
		group = _group;
		member = _a;
	}

	function issueTokens(address _tokenAddress, address _to, uint _amount) public {
		a = _to;
		tokenAddress = _tokenAddress;
		amount = _amount;
	}

	function removeGroupMember(string _groupName, address _a) public {
		groupName = _groupName;
		a = _a;
	}

	function allowActionByShareholder(bytes32 _what, address _a) public {
		group = _what;
		a = _a;
	}

	function allowActionByVoting(bytes32 _what, address _a) public {
		group = _what;
		a = _a;
	}

	function allowActionByAddress(bytes32 _what, address _a) public {
		group = _what;
		a = _a;
	}

	function allowActionByAnyMemberOfGroup(bytes32 _what, string _groupName) public {
		group = _what;
		groupName = _groupName;
	}

	function upgradeDaoContractGeneric(bytes32[] _params) external {
		IDaoBase _b = IDaoBase(address(_params[0]));
		upgradeDaoContract(_b);
	}

	function addGroupMemberGeneric(bytes32[] _params) external {
		bytes32 group = bytes32(_params[0]);
		address a = address(_params[1]);

		// direct call to storage here, instead of calling DaoBase.addGroupMember(string, address);
		addGroupMember(group, a);
	}

	function issueTokensGeneric(bytes32[] _params) external {
		address _tokenAddress = address(_params[0]);
		address _to = address(_params[1]);
		uint _amount = uint(_params[2]);


		issueTokens(_tokenAddress, _to, _amount);
	}

	function removeGroupMemberGeneric(bytes32[] _params) external {
		string memory _groupName = ConversionLib.bytes32ToString(_params[0]);
		address _a = address(_params[1]);

		removeGroupMember(_groupName, _a);
	}

	function allowActionByShareholderGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		address _a = address(_params[1]);

		allowActionByShareholder(_what, _a);
	}

	function allowActionByVotingGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		address _tokenAddress = address(_params[1]);

		allowActionByVoting(_what, _tokenAddress);
	}

	function allowActionByAddressGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		address _a = address(_params[1]);

		allowActionByAddress(_what, _a);
	}
 
	function allowActionByAnyMemberOfGroupGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		string memory _groupName = ConversionLib.bytes32ToString(_params[1]);

		allowActionByAnyMemberOfGroup(_what, _groupName);
	}

}
