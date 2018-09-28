pragma solidity ^0.4.22;

import "./IDaoBase.sol";
import "./DaoBase.sol";
import "./ImpersonationCaller.sol";
import "./utils/UtilsLib.sol";


/**
 * @title DaoBaseImpersonated 
 * @dev This contract is a helper that will call the action is not allowed directly (by the current user) on behalf of the other user.
 * It is calling it really without any 'delegatecall' so msg.sender will be DaoBaseImpersonated, not the original user!
 * 
 * WARNING: As long as this contract is just an ordinary DaoBase client -> you should give permissions to it 
 * just like to any other account/contract. So you should give 'manageGroups', 'issueTokens', etc to the DaoBaseImpersonated! 
 * Please see 'tests' folder for example.
*/
contract DaoBaseImpersonated is ImpersonationCaller {
	constructor(IDaoBase _daoBase)public 
		ImpersonationCaller(_daoBase)
	{
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _token address of token
	* @param _to address which will get all issued tokens
	* @param _amount amount of tokens which will be issued
	* @dev this function allow any account issue tokens on behalf by account which have needed rights by signing specified message
	*/
	function issueTokensImp(bytes32 _hash, bytes _sig, address _token, address _to, uint _amount) public {
		bytes32[] memory params = new bytes32[](3);
		params[0] = bytes32(_token);
		params[1] = bytes32(_to);
		params[2] = bytes32(_amount);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).ISSUE_TOKENS(), 
			"issueTokensGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _newMc new DaoBase instance (address)
	* @dev this function allow any account upgrade DAO contract on behalf by account which have needed rights by signing specified message
	*/
	function upgradeDaoContractImp(bytes32 _hash, bytes _sig, address _newMc) public {
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).UPGRADE_DAO_CONTRACT(), 
			"upgradeDaoContractGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _group name of the group in storage
	* @param _a address which will be added to the group with name _group
	* @dev this function allow any account add group member on behalf by account which have needed rights by signing specified message
	*/
	function addGroupMemberImp(bytes32 _hash, bytes _sig, string _group, address _a) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = UtilsLib.stringToBytes32(_group);
		params[1] = bytes32(_a);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).MANAGE_GROUPS(), 
			"addGroupMemberGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _groupName name of the group in storage
	* @param _a address which will be removed from the group with name _groupName
	* @dev this function allow any account remove group member on behalf by account which have needed rights by signing specified message
	*/
	function removeGroupMemberImp(bytes32 _hash, bytes _sig, string _groupName, address _a) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = UtilsLib.stringToBytes32(_groupName);
		params[1] = bytes32(_a);

		doActionOnBehalfOf(
			_hash,
			_sig, 
			DaoBase(daoBase).REMOVE_GROUP_MEMBER(), 
			"removeGroupMemberGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _what permission name in hash
	* @param _tokenAddress address of the token
	* @dev this function allow any account allow action by shareholder on behalf by account which have needed rights by signing specified message
	*/
	function allowActionByShareholderImp(bytes32 _hash, bytes _sig, bytes32 _what, address _tokenAddress) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = bytes32(_tokenAddress);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).ALLOW_ACTION_BY_SHAREHOLDER(), 
			"allowActionByShareholderGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _what permission name in hash
	* @param _tokenAddress address of the token
	* @dev this function allow any account allow action by voting on behalf by account which have needed rights by signing specified message
	*/
	function allowActionByVotingImp(bytes32 _hash, bytes _sig, bytes32 _what, address _tokenAddress) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = bytes32(_tokenAddress);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).ALLOW_ACTION_BY_VOTING(), 
			"allowActionByVotingGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _what permission name in hash
	* @param _a address
	* @dev this function allow any account allow action by address on behalf by account which have needed rights by signing specified message
	*/
	function allowActionByAddressImp(bytes32 _hash, bytes _sig, bytes32 _what, address _a) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = bytes32(_a);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).ALLOW_ACTION_BY_ADDRESS(), 
			"allowActionByAddressGeneric(bytes32[])", 
			params
		);
	}

	/**
	* @param _hash hash of the message which account sign
	* @param _sig signature of the account which have rights for action needed
	* @param _what permission name in hash
	* @param _groupName name of the group in storage
	* @dev this function allow any account allow action by any member of group on behalf by account which have needed rights by signing specified message
	*/
	function allowActionByAnyMemberOfGroupImp(bytes32 _hash, bytes _sig, bytes32 _what, string _groupName) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = UtilsLib.stringToBytes32(_groupName);

		doActionOnBehalfOf(
			_hash, 
			_sig, 
			DaoBase(daoBase).ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP(), 
			"allowActionByAnyMemberOfGroupGeneric(bytes32[])", 
			params
		);
	}
}
