pragma solidity ^0.4.23;

import "./WeiExpense.sol";

contract WeiRelativeExpense is WeiExpense {
	constructor(uint _percentsMul100)public 
		WeiExpense(0, _percentsMul100, 0, false, false)
	{}
}