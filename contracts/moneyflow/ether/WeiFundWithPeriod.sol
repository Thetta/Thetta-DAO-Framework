pragma solidity ^0.4.24;
import "./WeiFund.sol";


contract WeiFundWithPeriod is WeiFund {
	constructor(uint _neededWei, uint _periodHours) public WeiFund(_neededWei, true, false, _periodHours) {
	}
}