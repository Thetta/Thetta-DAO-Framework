pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint _ppm, uint _periodHours, bool _isAccumulateDebt) public 
		WeiExpense(0, _ppm, _periodHours, _isAccumulateDebt, true)
	{}
}
