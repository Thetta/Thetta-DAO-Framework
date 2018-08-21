pragma solidity ^0.4.22;

import "./IWeiReceiver.sol";


/**
 * @title Moneyflow 
*/
contract IMoneyflow {
	// send Ether using 'sendFunds' method here
	function getRevenueEndpoint() public view returns(IWeiReceiver);
	function getDonationEndpoint() public view returns(IWeiReceiver);

	// send Ether using default fallback functions here
	function getRevenueEndpointAddress() public view returns(address);
	function getDonationEndpointAddress() public view returns(address);

	// send all donations to the msg.sender (onlyOwner of this contract)
	function withdrawDonationsTo(address _out) public;

// Receivers
	// usually _receiver is a MoneyFlowScheme 
	// see Schemes.sol for example
	function setRootWeiReceiver(IWeiReceiver _receiver) public;
}