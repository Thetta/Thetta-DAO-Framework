pragma solidity ^0.4.23;

import "./WeiExpense.sol";

contract WeiAbsoluteExpense is WeiExpense {
	constructor(uint _neededWei) public 
		WeiExpense(_neededWei, 0, 0, false, false)
	{}
}