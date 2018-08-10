pragma solidity ^0.4.23;

/**
 * @title IDestination 
 * @dev Keeps all money until flush is called
*/
contract IDestination {
	// pull model
	function flush() public;
	function flushTo(address _to) public;
}