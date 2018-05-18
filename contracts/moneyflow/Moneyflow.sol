pragma solidity ^0.4.15;
import "./IMoneyflow.sol";
import "./IWeiReceiver.sol";
import "./WeiFund.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract MoneyFlow is IMoneyflow, Ownable {
	WeiFund donationEndpoint;

	// by default - this is 0x0, please use setWeiReceiver method
	// this can be a WeiSplitter (top-down or unsorted)
	IWeiReceiver rootReceiver;

	function MoneyFlow()public{
		// do not set output!
		donationEndpoint = new WeiFund(0x0, true, 10000);
	}

   modifier isCanDo(string _what){
		//require(mc.isCanDoAction(msg.sender, _what)); 
		_; 
	}

// IMoneyflow:
	function getDonationEndpoint()public constant returns(IWeiReceiver){
		return donationEndpoint;
	}

	// will withdraw donations to the msg.caller
	// TODO: require voting!!!
	function withdrawDonationsTo(address _out)public onlyOwner {
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
	// 
	// TODO: require voting!!!
	function setRootWeiReceiver(IWeiReceiver _receiver) public onlyOwner {
		rootReceiver = _receiver;
	}

///////////////////
	function() public {
		// non payable
	}
}

