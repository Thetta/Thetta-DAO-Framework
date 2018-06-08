pragma solidity ^0.4.15;

// Proxy contract for testing throws
contract ThrowProxy {
	address public target;
	bytes data;

	constructor(address _target) public{
		target = _target;
	}

	//prime the data using the fallback function.
	function() public payable{
		data = msg.data;
	}

	function execute() external returns (bool) {
		return target.call(data);
	}
}
