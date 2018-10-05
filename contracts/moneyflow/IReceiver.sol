pragma solidity ^0.4.23;


/**
 * @title IReceiver 
 * @dev Something that needs funds 
*/
contract IReceiver {
	// In case we have absolute output -> will return 0
	// in 1/10000th percents of input. Examples:
	// 1200 is 0.12% of input; 
	// 10000 is 1% of input
	function getPartsPerMillion() public view returns(uint);

	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeedsMoney() public view returns(bool);

	// WeiReceiver should process all tokens here (hold it or send it somewhere else)
	function processFunds(uint _currentFlow) public payable;

	// non payable!
	function() public;
}