pragma solidity ^0.4.22;

import "./utils/GenericCaller.sol";
import "./IDaoBase.sol";
import "./DaoBase.sol";
import "./utils/UtilsLib.sol";


/**
 * @title DaoBaseAuto
 * @dev This contract is a helper that will create new Proposal (i.e. voting) if the action is not allowed directly.
 * This should be used with DaoBaseWithUnpackers (not with DaoBase) and is completely optional.
 *
 * WARNING: As long as this contract is just an ordinary DaoBase client -> you should give access permissions to it 
 * just like to any other account/contract. So you should give 'manageGroups', 'issueTokens', etc to the DaoBaseAuto! 
 * Please see 'tests' folder for example.
*/
contract DaoBaseAuto is GenericCaller {
	constructor(IDaoBase _dao)public
		GenericCaller(_dao)
	{
	}

	/**
	* @param _group name of the group in storage
	* @param _a address which will be added to the group with name _groupName
	* @return new proposal (address) - could be 0x0
	* @dev this function add group member tokens by DAO
	*/
	function addGroupMemberAuto(string _group, address _a) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);

		params[0] = UtilsLib.stringToBytes32(_group);
		params[1] = bytes32(_a);

		return doAction(
			DaoBase(address(dao)).MANAGE_GROUPS(), 
			dao, 
			msg.sender,
			"addGroupMemberGeneric(bytes32[])",
			params
		);
	}

	/**
	* @param _token address of token
	* @param _to address which will get all issued tokens
	* @param _amount amount of tokens which will be issued 
	* @return new proposal (address) - could be 0x0
	* @dev this function issue tokens for _to address by DAO
	*/
	function issueTokensAuto(address _token, address _to, uint _amount) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](3);
		params[0] = bytes32(_token);
		params[1] = bytes32(_to);
		params[2] = bytes32(_amount);

		return doAction(
			DaoBase(address(dao)).ISSUE_TOKENS(), 
			dao, 
			msg.sender,
			"issueTokensGeneric(bytes32[])",
			params
		);
	}

	/**
	* @param _newMc new DaoBase instance (address)
	* @return new proposal (address) - could be 0x0
    * @dev this function for upgrades DAO instance by DAO 
	*/
	function upgradeDaoContractAuto(address _newMc) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);

		return doAction(
			DaoBase(address(dao)).UPGRADE_DAO_CONTRACT(), 
			dao, 
			msg.sender,
			"upgradeDaoContractGeneric(bytes32[])",
			params
		);
	}

	/**
	* @notice this function can call only account with MANAGE_GROUPS permissions
	* @param _groupName name of the group in storage
	* @param _a address which will be removed from the group with name _groupName
	* @return new proposal (address) - could be 0x0
	* @dev this function removes group member from group with name _groupName in storage
	*/
	function removeGroupMemberAuto(string _groupName, address _a) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = UtilsLib.stringToBytes32(_groupName);
		params[1] = bytes32(_a);

		return doAction(
			DaoBase(address(dao)).REMOVE_GROUP_MEMBER(), 
			dao, 
			msg.sender,
			"removeGroupMemberGeneric(bytes32[])",
			params
		);
	}

	/**
	* @param _what permission name in hash
	* @param _tokenAddress address of the token
	* @return new proposal (address) - could be 0x0
	* @dev this function allows action with name _what for _tokenAddress by DAO
	*/
	function allowActionByShareholderAuto(bytes32 _what, address _tokenAddress) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = bytes32(_tokenAddress);

		return doAction(
			DaoBase(address(dao)).ALLOW_ACTION_BY_SHAREHOLDER(), 
			dao, 
			msg.sender,
			"allowActionByShareholderGeneric(bytes32[])",
			params
		);
	}

	/**
	* @param _what permission name in hash
	* @param _tokenAddress address of the token
	* @return new proposal (address) - could be 0x0
	* @dev this function allows action with name _what for _tokenAddress by DAO
	*/
	function allowActionByVotingAuto(bytes32 _what, address _tokenAddress) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = bytes32(_tokenAddress);

		return doAction(
			DaoBase(address(dao)).ALLOW_ACTION_BY_VOTING(), 
			dao, 
			msg.sender,
			"allowActionByVotingGeneric(bytes32[])",
			params
		);
	}

	/**
	* @param _what permission name in hash
	* @param _a address
	* @return new proposal (address) - could be 0x0
	* @dev this function allows action with name _what for _a by DAO
	*/
	function allowActionByAddressAuto(bytes32 _what, address _a) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = bytes32(_a);

		return doAction(
			DaoBase(address(dao)).ALLOW_ACTION_BY_ADDRESS(), 
			dao, 
			msg.sender,
			"allowActionByAddressGeneric(bytes32[])",
			params
		);
	}

	/**
	* @param _what permission name in hash
	* @param _groupName name of the group in storage
	* @return new proposal (address) - could be 0x0
	* @dev this function allows action with name _what for group with name _groupName by DAO
	*/
	function allowActionByAnyMemberOfGroupAuto(bytes32 _what, string _groupName) public returns(address proposalOut) {
		bytes32[] memory params = new bytes32[](2);
		params[0] = _what;
		params[1] = UtilsLib.stringToBytes32(_groupName);

		return doAction(
			DaoBase(address(dao)).ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP(), 
			dao, 
			msg.sender,
			"allowActionByAnyMemberOfGroupGeneric(bytes32[])",
			params
		);
	}
}
