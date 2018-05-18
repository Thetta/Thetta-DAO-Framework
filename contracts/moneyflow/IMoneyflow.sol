pragma solidity ^0.4.15;

import "./WeiExpense.sol";

contract IMoneyflow {
	// send revenue here!
	function getRevenueEndpoint()public constant returns(IWeiReceiver);
	function getDonationEndpoint()public constant returns(IWeiReceiver);

	// send all donations to the msg.sender (onlyOwner of this contract)
	// TODO: should require VOTING
	function withdrawDonationsTo(address _out)public;

// Receivers
	// usually _receiver is a MoneyFlowScheme 
	// see Schemes.sol for example
	function setRootWeiReceiver(IWeiReceiver _receiver) public;
}

contract IMoneyflowScheme {
	function addNewTaskAuto(WeiAbsoluteExpense wt) public returns(address voteOut);
}
