pragma solidity ^0.4.24;
import "./WeiFund.sol";


contract WeiFundWithPeriodSliding is WeiFund {
	constructor(uint _neededWei, uint _periodHours) public WeiFund(_neededWei, true, true, _periodHours) {
	}
}