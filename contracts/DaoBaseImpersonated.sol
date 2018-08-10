pragma solidity ^0.4.22;

import "./IDaoBase.sol";
import "./ImpersonationCaller.sol";

import "zeppelin-solidity/contracts/ECRecovery.sol";

// TODO: convert to library?


/**
 * @title DaoBaseImpersonated 
 * @dev This contract is a helper that will call the action is not allowed directly (by the current user) on behalf of the other user.
 * It is calling it really without any 'delegatecall' so msg.sender will be DaoBaseImpersonated, not the original user!
 * 
 * WARNING: As long as this contract is just an ordinary DaoBase client -> you should provide permissions to it 
 * just like to any other account/contract. So you should give 'manageGroups', 'issueTokens', etc to the DaoBaseImpersonated! 
 * Please see 'tests' folder for example.
*/
contract DaoBaseImpersonated is ImpersonationCaller {
	constructor(IDaoBase _dao)public 
		ImpersonationCaller(_dao)
	{
	}

	function issueTokensImp(bytes32 _hash, bytes _sig, address _token, address _to, uint _amount) public {
		bytes32[] memory params = new bytes32[](3);
		params[0] = bytes32(_token);
		params[1] = bytes32(_to);
		params[2] = bytes32(_amount);

	   return doActionOnBehalfOf(_hash, _sig, ISSUE_TOKENS, "issueTokensGeneric(bytes32[])", params);
	}

	// TODO: add other methods:
	/*
	function upgradeDaoContractImp(address _newMc) public returns(address proposalOut);
	function addGroup(string _groupName) public isCanDo("manageGroups")
	function addGroupMemberImp(string _group, address _a) public returns(address proposalOut);
	function removeGroupMember(string _groupName, address _a) public isCanDo("manageGroups"){
	function allowActionByShareholder(string _what, address _tokenAddress) public isCanDo("manageGroups"){
	function allowActionByVoting(string _what, address _tokenAddress) public isCanDo("manageGroups"){
	function allowActionByAddress(string _what, address _a) public isCanDo("manageGroups"){
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public isCanDo("manageGroups"){
   ...
   */
}


