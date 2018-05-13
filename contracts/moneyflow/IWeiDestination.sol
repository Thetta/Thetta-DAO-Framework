pragma solidity ^0.4.15;

// this contract should keep all money until flush is called
contract IWeiDestination {
	// pull model
	function flush() public;
	function flushTo(address _to) public;
}
