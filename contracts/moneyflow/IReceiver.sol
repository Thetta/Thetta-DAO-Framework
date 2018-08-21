pragma solidity ^0.4.23;


/**
 * @title IReceiver 
 * @dev Something that needs funds 
*/
contract IReceiver {
	// In case we have absolute output -> will return 0
	// in 1/100th percents of input. Examples:
	// 12 is 0.12% of input; 
	// 100 is 1% of input
	function getPercentsMul100()view public returns(uint);

	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeedsMoney()view public returns(bool);

	// WeiReceiver should process all tokens here (hold it or send it somewhere else)
	function processFunds(uint _currentFlow) public payable;

	// non payable!
	function()public;
}