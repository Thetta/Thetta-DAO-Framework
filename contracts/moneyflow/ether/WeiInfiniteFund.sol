pragma solidity ^0.4.24;
import "./WeiFund.sol";


contract WeiInfiniteFund is WeiFund {
	constructor() public WeiFund(0, false, false, 0) {
	}
}