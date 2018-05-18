pragma solidity ^0.4.15;

import "./WeiExpense.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////
// WeiFund can store funds until 'flush' is called (pull model)
// This is a terminal item, that has no children
contract WeiFund is WeiRelativeExpense {
	address public output;		// will not be able to change that later!
	bool public allowFlushTo = true;

	function WeiFund(address _output, bool _allowFlushTo, uint _percentsDiv100Needed) public 
		WeiRelativeExpense(_percentsDiv100Needed)	
	{
		output = _output;
		allowFlushTo = _allowFlushTo;
	}

	// Process funds, send it to the Output
	function flushTo(address _to) public onlyOwner {
		require(allowFlushTo);		// this operation can be prohibited
		_to.transfer(this.balance);
	}

	// Process funds, send it to the Output
	function flush() public onlyOwner {
		// TODO: check for vulnerabilities
		isMoneyReceived = false;
		output.transfer(this.balance);
	}

	function isNeedsMoney()constant public returns(bool){
		// fund always needs money!
		return true;
	}
}
