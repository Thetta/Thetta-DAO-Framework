pragma solidity ^0.4.15;

import "./WeiExpense.sol";

contract IMoneyflow {
	// send Ether using 'sendFunds' method here
	function getRevenueEndpoint()public constant returns(IWeiReceiver);
	function getDonationEndpoint()public constant returns(IWeiReceiver);

	// send Ether using default fallback functions here
	function getRevenueEndpointAddress()public constant returns(address);
	function getDonationEndpointAddress()public constant returns(address);

	// send all donations to the msg.sender (onlyOwner of this contract)
	function withdrawDonationsTo(address _out)public;

// Receivers
	// usually _receiver is a MoneyFlowScheme 
	// see Schemes.sol for example
	function setRootWeiReceiver(IWeiReceiver _receiver) public;
}

contract IMoneyflowScheme {
	function addNewTask(WeiAbsoluteExpense wt) public;
	function setSalaryForEmployee(address _employee, uint _weiPerMonth) public;
	function setBonusForEmployee(address _employee, uint _bonusPercentsPerMonth) public;
	function setOtherSpend(string _name, uint _weiPerMonth) public;
}

