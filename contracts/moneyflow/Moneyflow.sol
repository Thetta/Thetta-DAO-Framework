pragma solidity ^0.4.22;
import "./IMoneyflow.sol";

import "./ether/WeiFund.sol";
import "./ether/WeiExpense.sol";

import "../IDaoBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title FallbackToWeiReceiver
 * @dev Easy-to-use wrapper to convert fallback -> processFunds()
 * fallback -> processFunds
*/
contract FallbackToWeiReceiver {
	address output = 0x0;

	// _output should be IWeiReceiver
	constructor(address _output) public {
		output = _output;
	}

	function()public payable{
		IWeiReceiver iwr = IWeiReceiver(output);
		iwr.processFunds.value(msg.value)(msg.value);
	}
}

/**
 * @title MoneyFlow 
 * @dev Reference (typical example) implementation of IMoneyflow
 * Use it or modify as you like. Please see tests
 * No elements are directly available. Work with all children only throught the methods like 
 * 'setRootWeiReceiverGeneric', etc
*/
contract MoneyFlow is IMoneyflow, DaoClient, Ownable {
	WeiRelativeExpenseWithPeriod donationEndpoint;
	// by default - this is 0x0, please use setWeiReceiver method
	// this can be a ISplitter (top-down or unsorted)
	IWeiReceiver rootReceiver;

	FallbackToWeiReceiver donationF2WR;
	FallbackToWeiReceiver revenueF2WR;

	bytes32 constant public WITHDRAW_DONATIONS = keccak256("withdrawDonations");
	bytes32 constant public SET_ROOT_WEI_RECEIVER = keccak256("setRootWeiReceiver");

	event MoneyFlow_WithdrawDonations(address _by, address _to, uint _balance);
	event MoneyFlow_SetRootWeiReceiver(address _sender, address _receiver);

	constructor(IDaoBase _dao) public
		DaoClient(_dao)
	{
		// do not set output!
		donationEndpoint = new WeiRelativeExpenseWithPeriod(10000, 0, false);
		donationF2WR = new FallbackToWeiReceiver(donationEndpoint);
	}

// IMoneyflow:
	// will withdraw donations
	function withdrawDonationsTo(address _out) public isCanDo(WITHDRAW_DONATIONS){
		emit MoneyFlow_WithdrawDonations(msg.sender, _out, address(donationEndpoint).balance);
		donationEndpoint.flushTo(_out);
	}

	function getDonationEndpoint()public constant returns(IWeiReceiver){
		return donationEndpoint;
	}

	function getRevenueEndpoint()public constant returns(IWeiReceiver){
		return rootReceiver;
	}

	function getDonationEndpointAddress()public constant returns(address){
		return address(donationF2WR);
	}

	function getRevenueEndpointAddress()public constant returns(address){
		return address(revenueF2WR);
	}

	function setRootWeiReceiverGeneric(bytes32[] _params) public {
		IWeiReceiver receiver = IWeiReceiver(address(_params[0]));
		setRootWeiReceiver(receiver);
	}

	function withdrawDonationsToGeneric(bytes32[] _params) public {
		address out = address(_params[0]);
		withdrawDonationsTo(out);
	}

// WeiReceivers:
	// receiver can be a splitter, fund or event task
	// _receiver can be 0x0!
	function setRootWeiReceiver(IWeiReceiver _receiver) public {
		emit MoneyFlow_SetRootWeiReceiver(msg.sender, address(_receiver));
		rootReceiver = _receiver;
		revenueF2WR = new FallbackToWeiReceiver(address(rootReceiver));
	}

///////////////////
	function() public {
		// non payable
	}
}

