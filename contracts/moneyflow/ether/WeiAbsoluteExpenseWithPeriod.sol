pragma solidity ^0.4.23;

import "./WeiExpense.sol";

contract WeiAbsoluteExpenseWithPeriod is WeiExpense { 
	constructor(uint _neededWei, uint _periodHours, bool _isAccumulateDebt) public
		WeiExpense(_neededWei, 0, _periodHours, _isAccumulateDebt, true)
	{}
}