pragma solidity ^0.4.15;

contract IMoneyflow {
	// send revenue here!
	function getRevenueEndpointAddress()public constant returns(address);
	function getDonationEndpointAddress()public constant returns(address);

	// send all donations to the msg.sender (onlyOwner of this contract)
	// TODO: should require VOTING
	function withdrawDonations()public;

// Receivers
	function setWeiReceiver(address _receiver) public;
}
