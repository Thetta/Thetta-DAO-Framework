pragma solidity ^0.4.24;
import "./WeiFund.sol";

/**
 * @title WeiFundWithPeriod 
 * @dev WeiFundWithPeriod is a WeiFund that every period need _neededWei. If not collected enough – amount will slide
 * This is a terminal item, that has no children.
*/



contract WeiFundWithPeriodSliding is WeiFund {
	constructor(uint _neededWei, uint _periodHours) public WeiFund(_neededWei, true, true, _periodHours) {
	}
}