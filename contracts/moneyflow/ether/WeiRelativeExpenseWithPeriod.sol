pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint _partsPerMillion, uint _periodHours, bool _isAccumulateDebt) public 
		WeiExpense(0, _partsPerMillion, _periodHours, _isAccumulateDebt, true)
	{}
}
