pragma solidity ^0.4.24;
import "./WeiFund.sol";

/**
 * @title WeiUncappedFund 
 * @dev WeiUncappedFund is a WeiFund that will keep receiving ANY amount of ETH forever
 * This is a terminal item, that has no children.
*/



contract WeiUncappedFund is WeiFund {
	constructor(uint _neededWei) public WeiFund(_neededWei, false, false, 0) {
	}
}