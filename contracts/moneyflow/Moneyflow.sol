pragma solidity ^0.4.15;
import "./IMoneyflow.sol";
import "./IWeiReceiver.sol";
import "./WeiFund.sol";

import "../IMicrocompany.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract MoneyFlow is IMoneyflow, MicrocompanyUser, Ownable {
	WeiFund donationEndpoint;
	// by default - this is 0x0, please use setWeiReceiver method
	// this can be a WeiSplitter (top-down or unsorted)
	IWeiReceiver rootReceiver;

	FallbackToWeiReceiver donationF2WR;
	FallbackToWeiReceiver revenueF2WR;

	function MoneyFlow(IMicrocompanyBase _mc) public
		MicrocompanyUser(_mc)
	{
		// do not set output!
		donationEndpoint = new WeiFund(0x0, true, 10000);
		donationF2WR = new FallbackToWeiReceiver(donationEndpoint);
	}

// IMoneyflow:
	// will withdraw donations
	function withdrawDonationsTo(address _out)public isCanDo("withdrawDonations"){
		// TODO: add voting
		donationEndpoint.flushTo(_out);
	}

	function getDonationEndpoint()public constant returns(IWeiReceiver){
		return donationEndpoint;
	}

	function getRevenueEndpoint()public constant returns(IWeiReceiver){
		//require(0x0!=rootReceiver);
		return rootReceiver;
	}

	function getDonationEndpointAddress()public constant returns(address){
		return address(donationF2WR);	
	}

	function getRevenueEndpointAddress()public constant returns(address){
		//require(0x0!=rootReceiver);
		return address(revenueF2WR);	
	}

// WeiReceivers:
	// receiver can be a splitter, fund or event task
	// _receiver can be 0x0!
	function setRootWeiReceiver(IWeiReceiver _receiver) public isCanDo("modifyMoneyscheme") {
		// TODO: add voting
		rootReceiver = _receiver;

		revenueF2WR = new FallbackToWeiReceiver(address(rootReceiver));
	}

///////////////////
	function() public {
		// non payable
	}
}

