pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiRelativeExpense is WeiExpense {
	constructor(uint _ppm)public 
		WeiExpense(0, _ppm, 0, false, false)
	{}
}