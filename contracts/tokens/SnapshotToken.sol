pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "./PreserveBalancesOnTransferToken.sol";

/**
 * @title SnapshotToken
 * @author Based on code by Thetta DAO Framework: https://github.com/Thetta/Thetta-DAO-Framework/
 * @dev Wapper to use snapshot.balanceOf() instead of token.getBalanceAtEventStart() 
 * Should not be created directly. Please use PreserveBalancesOnTransferToken.createNewSnapshot() method
*/
contract SnapshotToken is StandardToken, Ownable {
	PreserveBalancesOnTransferToken public pbott;
	uint public snapshotID = 0;
	bool isStarted = false;

	constructor(PreserveBalancesOnTransferToken _pbott) public {
		pbott = _pbott; 
	}

	// BasicToken overrides:
	/**
	* @dev Gets the balance of the specified address.
	* @param _owner The address to query the the balance of.
	* @return An uint256 representing the amount owned by the passed address.
	*/
	function balanceOf(address _owner) public view returns (uint256) {
		return pbott.getBalanceAtEventStart(snapshotID, _owner);
	}

	/**
	* @dev Transfer token for a specified address. Blocked!
	* @param _to The address to transfer to.
	* @param _value The amount to be transferred.
	*/
	function transfer(address _to, uint256 _value) public returns (bool) {
		revert();
		return false;
	}

	// StandardToken overrides:
	/**
	 * @dev Transfer tokens from one address to another. Blocked!
	 * @param _from address The address which you want to send tokens from
	 * @param _to address The address which you want to transfer to
	 * @param _value uint256 the amount of tokens to be transferred
	 */
	function transferFrom(address _from, address _to, uint256 _value) 
		public returns (bool) 
	{
		revert();
		return false;
	}

	// New methods:
	/**
	 * @dev Should be called automatically from the PreserveBalancesOnTransferToken 
	 */
	function start() public {
		require(pbott == msg.sender);
		require(!isStarted);

		snapshotID = pbott.startNewEvent();
		isStarted = true;
	}

	/**
	 * @dev Should be called automatically from the PreserveBalancesOnTransferToken 
	 */
	function finish() public {
		require(pbott == msg.sender);
		require(isStarted);

		pbott.finishEvent(snapshotID);
	}
}