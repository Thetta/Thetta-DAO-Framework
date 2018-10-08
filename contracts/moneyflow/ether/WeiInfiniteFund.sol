pragma solidity ^0.4.24;
import "./WeiFund.sol";

/**
 * @title WeiInfiniteFund 
 * @dev WeiInfiniteFund is a WeiFund that needs money always
 * This is a terminal item, that has no children.
*/


contract WeiInfiniteFund is WeiFund {
	constructor() public WeiFund(0, false, false, 0) {
	}
}