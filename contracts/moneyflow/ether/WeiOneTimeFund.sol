pragma solidity ^0.4.24;
import "./WeiFund.sol";


contract WeiOneTimeFund is WeiFund {
	constructor(uint _neededWei) public WeiFund(_neededWei, false, false, 0) {
	}
}