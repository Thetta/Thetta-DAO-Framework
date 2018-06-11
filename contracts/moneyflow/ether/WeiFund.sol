pragma solidity ^0.4.15;

import "../IMoneyflow.sol";

import "./WeiExpense.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title WeiFund 
 * @dev WeiFund stores funds until 'flush' is called (pull model)
 * This is a terminal item, that has no children.
*/
contract WeiFund is WeiRelativeExpense {
	address public output;		// will not be able to change that later!
	bool public allowFlushTo = true;

	event FlushToEvent(address _to, uint balance);
	event FlushEvent(address _to, uint balance);

	constructor(address _output, bool _allowFlushTo, uint _percentsDiv100Needed) public 
		WeiRelativeExpense(_percentsDiv100Needed)	
	{
		output = _output;
		allowFlushTo = _allowFlushTo;
	}

	// Process funds, send it to the Output
	function flushTo(address _to) external onlyOwner {
		require(allowFlushTo);		// this operation can be prohibited
		emit FlushToEvent(_to, address(this).balance);
		_to.transfer(address(this).balance);
	}

	// Process funds, send it to the Output
	function flush() external onlyOwner {
		require(0x0!=output);

		// TODO: check for vulnerabilities
		isMoneyReceived = false;
		emit FlushToEvent(output, address(this).balance);
		output.transfer(address(this).balance);
	}

	function isNeedsMoney()external view returns(bool){
		// fund always needs money!
		return true;
	}
}
