pragma solidity ^0.4.15;
import "./IMoneyflow.sol";

import "./ether/WeiFund.sol";

import "../IDaoBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// Easy-to-use wrapper to convert fallback -> processFunds()
// fallback -> processFunds
contract FallbackToWeiReceiver {
	address output = 0x0;

	// _output should be IWeiReceiver
	function FallbackToWeiReceiver(address _output) public {
		output = _output;
	}

	function()public payable{
		IWeiReceiver iwr = IWeiReceiver(output);
		iwr.processFunds.value(msg.value)(msg.value);		
	}
}

contract MoneyFlow is IMoneyflow, DaoClient, Ownable {
	WeiFund donationEndpoint;
	// by default - this is 0x0, please use setWeiReceiver method
	// this can be a ISplitter (top-down or unsorted)
	IWeiReceiver rootReceiver;

	FallbackToWeiReceiver donationF2WR;
	FallbackToWeiReceiver revenueF2WR;

	function MoneyFlow(IDaoBase _mc) public
		DaoClient(_mc)
	{
		// do not set output!
		donationEndpoint = new WeiFund(0x0, true, 10000);
		donationF2WR = new FallbackToWeiReceiver(donationEndpoint);
	}

	event WithdrawDonations(address _by, address _to, uint _balance);

// IMoneyflow:
	// will withdraw donations
	function withdrawDonationsTo(address _out) public isCanDo("withdrawDonations"){
		emit WithdrawDonations(msg.sender, _out, donationEndpoint.balance);

		//bool isCan = mc.isCanDoAction(msg.sender, "WithdrawDonations");
		//emit WithdrawDonationsCheck(isCan);

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
	function setRootWeiReceiver(IWeiReceiver _receiver) public isCanDo("modifyMoneyscheme") {
		rootReceiver = _receiver;
		revenueF2WR = new FallbackToWeiReceiver(address(rootReceiver));
	}

///////////////////
	function() public {
		// non payable
	}
}

