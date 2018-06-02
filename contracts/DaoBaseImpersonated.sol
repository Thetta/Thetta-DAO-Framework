pragma solidity ^0.4.15;

import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/ECRecovery.sol";

// TODO: convert to library?
contract ImpersonationCaller is DaoClient {
	function ImpersonationCaller(IDaoBase _db) public DaoClient(_db) {

	}

  /**
   * @dev Call action on behalf of the client
   * @param _hash bytes32 message, the hash is the signed message. What is recovered is the signer address.
   * @param _sig bytes signature, the signature is generated using web3.eth.sign()
   */
	function doActionOnBehalfOf(bytes32 _hash, bytes _sig, 
										 string _action, string _methodSig, bytes32[] _params) internal {

		// 1 - get the address of the client
		address client = ECRecovery.recover(_hash, _sig);

		// 2 - should be allowed to call action by a client
		require(mc.isCanDoAction(client, _action));
		
		// 3 - call 
		mc.call(
			bytes4(keccak256(_methodSig)),
			uint256(32),						 // pointer to the length of the array
			uint256(_params.length),		 // length of the array
			_params	
		);					
	}
}

// TODO: convert to library?
contract DaoBaseImpersonated is ImpersonationCaller {
	function DaoBaseImpersonated(IDaoBase _mc)public 
		ImpersonationCaller(_mc)
	{
	}

	function issueTokensImp(bytes32 _hash, bytes _sig, 
									 address _to, uint _amount) public {
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_to);
		params[1] = bytes32(_amount);

	   return doActionOnBehalfOf(_hash, _sig, "issueTokens", "issueTokensGeneric(bytes32[])", params);
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


