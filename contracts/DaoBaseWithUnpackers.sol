pragma solidity ^0.4.22;

import "./utils/UtilsLib.sol";

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
	constructor(DaoStorage _daoStorage) public DaoBase(_daoStorage){
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between upgradeDaoContractAuto and upgradeDaoContract. It calls upgradeDaoContract from DaoBase when voting is finished
	*/
	function upgradeDaoContractGeneric(bytes32[] _params) external {
		IDaoBase _b = IDaoBase(address(_params[0]));
		upgradeDaoContract(_b);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between addGroupMemberAuto and addGroupMember. It calls addGroupMember from DaoBase when voting is finished
	*/
	function addGroupMemberGeneric(bytes32[] _params) external {
		string memory _groupName = UtilsLib.bytes32ToString(_params[0]);
		address a = address(_params[1]);
		addGroupMember(_groupName, a);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between issueTokensAuto and issueTokens. It calls issueTokens from DaoBase when voting is finished
	*/
	function issueTokensGeneric(bytes32[] _params) external {
		address _tokenAddress = address(_params[0]);
		address _to = address(_params[1]);
		uint _amount = uint(_params[2]);
		issueTokens(_tokenAddress, _to, _amount);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between removeGroupMemberAuto and removeGroupMember. It calls removeGroupMember from DaoBase when voting is finished
	*/
	function removeGroupMemberGeneric(bytes32[] _params) external {
		string memory _groupName = UtilsLib.bytes32ToString(_params[0]);
		address _a = address(_params[1]);
		removeGroupMember(_groupName, _a);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between allowActionByShareholderAuto and allowActionByShareholder. It calls allowActionByShareholder from DaoBase when voting is finished
	*/
	function allowActionByShareholderGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		address _a = address(_params[1]);
		allowActionByShareholder(_what, _a);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between allowActionByVotingAuto and allowActionByVoting. It calls allowActionByVoting from DaoBase when voting is finished
	*/
	function allowActionByVotingGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		address _tokenAddress = address(_params[1]);
		allowActionByVoting(_what, _tokenAddress);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between allowActionByAddressAuto and allowActionByAddress. It calls allowActionByAddress from DaoBase when voting is finished
	*/
	function allowActionByAddressGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		address _a = address(_params[1]);
		allowActionByAddress(_what, _a);
	}

	/**
	* @param _params array with parameters in bytes32
	* @dev this function is intermediate layer between allowActionByAnyMemberOfGroupAuto and allowActionByAnyMemberOfGroup. It calls allowActionByAnyMemberOfGroup from DaoBase when voting is finished
	*/
	function allowActionByAnyMemberOfGroupGeneric(bytes32[] _params) external {
		bytes32 _what = bytes32(_params[0]);
		string memory _groupName = UtilsLib.bytes32ToString(_params[1]);
		allowActionByAnyMemberOfGroup(_what, _groupName);
	}
}
