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

	function MoneyFlow(IMicrocompanyBase _mc) public
		MicrocompanyUser(_mc)
	{
		// do not set output!
		donationEndpoint = new WeiFund(0x0, true, 10000);
	}

// IMoneyflow:
	function getDonationEndpoint()public constant returns(IWeiReceiver){
		return donationEndpoint;
	}

	// will withdraw donations
	function withdrawDonationsTo(address _out)public isCanDo("withdrawDonations"){
		// TODO: add voting

		donationEndpoint.flushTo(_out);
	}

	function getRevenueEndpoint()public constant returns(IWeiReceiver){
		// WARNING: this can be 0x0!
		// Do not send money here!
		return rootReceiver;
	}

// WeiReceivers:
	// receiver can be a splitter, fund or event task
	// _receiver can be 0x0!
	function setRootWeiReceiver(IWeiReceiver _receiver) public isCanDo("modifyMoneyscheme") {
		// TODO: add voting

		rootReceiver = _receiver;
	}

///////////////////
	function() public {
		// non payable
	}
}

