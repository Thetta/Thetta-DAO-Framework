pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ECRecovery.sol";

import "./DaoClient.sol";
import "./IDaoBase.sol";

// TODO: convert to library?

/**
 * @title ImpersonationCaller 
 * @dev This is a convenient wrapper that is used by the contract below (see DaoBaseImpersonated). Do not use it directly.
*/
contract ImpersonationCaller is DaoClient {
  constructor(IDaoBase _dao) public DaoClient(_dao) {

	}

  /**
   * @dev Call action on behalf of the client
   * @param _hash bytes32 message, the hash is the signed message. What is recovered is the signer address.
   * @param _sig bytes signature, the signature is generated using web3.eth.sign()
   */
	function doActionOnBehalfOf(bytes32 _hash, bytes _sig, bytes32 _action, string _methodSig, bytes32[] _params) internal {
		bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    bytes32 prefixedHash = keccak256(prefix, _hash);

		// 1 - get the address of the client
		address client = ECRecovery.recover(prefixedHash, _sig);

		// 2 - should be allowed to call action by a client
		require(dao.isCanDoAction(client, _action));

		// 3 - call 
		if(!address(dao).call(
			bytes4(keccak256(abi.encodePacked(_methodSig))),
			uint256(32),						 // pointer to the length of the array
			uint256(_params.length),		 // length of the array
			_params)){
			revert();
		}
	}
}