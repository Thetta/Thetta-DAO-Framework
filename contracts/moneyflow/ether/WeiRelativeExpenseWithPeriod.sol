pragma solidity ^0.4.23;

import "./WeiExpense.sol";

contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint _percentsMul100, uint _periodHours, bool _isAccumulateDebt) public 
		WeiExpense(0, _percentsMul100, _periodHours, _isAccumulateDebt, true)
	{}
}
