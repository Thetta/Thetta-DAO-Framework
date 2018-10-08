pragma solidity ^0.4.24;
import "./WeiFund.sol";

/**
 * @title WeiInfiniteFund 
 * @dev WeiInfiniteFund is a WeiFund that needs money util collect _neededWei
 * This is a terminal item, that has no children.
*/



contract WeiOneTimeFund is WeiFund {
	constructor(uint _neededWei) public WeiFund(_neededWei, false, false, 0) {
	}
}