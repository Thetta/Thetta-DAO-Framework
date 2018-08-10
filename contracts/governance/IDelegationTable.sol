pragma solidity ^0.4.23;

/**
 * @title For "Liquid democracy" 
 * @dev Rules: 
 * 1 - If total power is 1000 and you delegate some power -> total power is (always) still 1000.
 * 2 - You can not REdelegate the power delegated to you. You can delegate only your current balance.
 * 3 - You can removeDelegation at any time 
*/
contract IDelegationTable {
	// @dev delegateMyVoiceTo() will override the currently set value. 
	// I.e., if you called delegateMyVoiceTo(A,10) and then delegateMyVoiceTo(A,20) again, 
	// then getDelegatedPowerByMe(A) is 20 (not 30!)
	function delegateMyVoiceTo(address _to, uint _tokenAmount) public;
	// @dev Returns how much i delegated power to _to
	function getDelegatedPowerByMe(address _to) public view returns(uint);
	// @dev Cancel the delegation of power to _to
	function removeDelegation(address _to) public;

	// @dev Returns the sum of: balance of _who AND the total delegated power of _who 
	function getPowerOf(address _who) public view returns(uint);
	// @dev Returns the total delegated power of _who 
	function getDelegatedPowerOf(address _of) public view returns(uint);
}