import "./utils/ConversionLib.sol";

import "./DaoBase.sol";

/**
 * @title DaoBaseWithUnpackers
 * @dev Use this contract instead of DaoBase if you need DaoBaseAuto.
 * It features method unpackers that will convert bytes32[] params to the method params.
 *
 * When DaoBaseAuto will creates voting/proposal -> it packs params into the bytes32[] 
 * After voting is finished -> target method is called and params should be unpacked
*/
contract DaoBaseWithUnpackers is DaoBase {
	address autoCaller;

	constructor(DaoStorage _store) public 
		DaoBase(_store)
	{
	}

	modifier onlyAutoCaller() { 
		require (msg.sender == autoCaller); 
		_; 
	}
	

	function setAutoCaller(address _autoCaller) onlyOwner public {
		autoCaller = _autoCaller;
	}
	

	function upgradeDaoContractGeneric(bytes32[] _params) onlyAutoCaller external {
		IDaoBase _b = IDaoBase(address(_params[0]));
		upgradeDaoContract(_b);
	}

	function addGroupMemberGeneric(bytes32[] _params) onlyAutoCaller external {
		bytes32 group = bytes32(_params[0]);
		address a = address(_params[1]);

		// direct call to storage here, instead of calling DaoBase.addGroupMember(string, address);
		store.addGroupMember(group, a);
	}

	function issueTokensGeneric(bytes32[] _params) onlyAutoCaller external {
		address _tokenAddress = address(_params[0]);
		address _to = address(_params[1]);
		uint _amount = uint(_params[2]);

		issueTokens(_tokenAddress, _to, _amount);
	}

	function removeGroupMemberGeneric(bytes32[] _params) onlyAutoCaller external {
		string memory _groupName = ConversionLib.bytes32ToString(_params[0]);
		address _a = address(_params[1]);

		removeGroupMember(_groupName, _a);
	}

	function allowActionByShareholderGeneric(bytes32[] _params) onlyAutoCaller external {
		bytes32 _what = bytes32(_params[0]);
		address _a = address(_params[1]);

		allowActionByShareholder(_what, _a);
	}

	function allowActionByVotingGeneric(bytes32[] _params) onlyAutoCaller external {
		bytes32 _what = bytes32(_params[0]);
		address _tokenAddress = address(_params[1]);

		allowActionByVoting(_what, _tokenAddress);
	}

	function allowActionByAddressGeneric(bytes32[] _params) onlyAutoCaller external {
		bytes32 _what = bytes32(_params[0]);
		address _a = address(_params[1]);

		allowActionByAddress(_what, _a);
	}
 
	function allowActionByAnyMemberOfGroupGeneric(bytes32[] _params) onlyAutoCaller external {
		bytes32 _what = bytes32(_params[0]);
		string memory _groupName = ConversionLib.bytes32ToString(_params[1]);

		allowActionByAnyMemberOfGroup(_what, _groupName);
	}
}
