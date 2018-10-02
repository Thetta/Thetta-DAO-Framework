pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiRelativeExpense is WeiExpense {
	constructor(uint _partsPerMillion)public 
		WeiExpense(0, _partsPerMillion, 0, false, false)
	{}
}