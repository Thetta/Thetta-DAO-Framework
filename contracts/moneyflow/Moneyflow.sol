pragma solidity ^0.4.15;
import "./IMoneyflow.sol";
import "./WeiFund.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract DonationEndpoint is Ownable {
	function DonationEndpoint()public {

	}

	function withdrawDonations(address _to)public onlyOwner{
		_to.transfer(this.balance);
	}
}

contract MoneyFlow is IMoneyflow, Ownable {
	DonationEndpoint public donationEndpoint;
	// this can be a WeiSplitter (top-down or unsorted)
	IWeiReceiver public firstReceiver;

	function MoneyFlow()public{
		donationEndpoint = new DonationEndpoint();
		
		// by default -> first receiver if a simple 'pull' fund to collect money through 
		// the revenue endpoint
		// to change it - use setWeiReceiver method
		firstReceiver = new WeiFund();
	}

// IMoneyflow:
	function getDonationEndpointAddress()public constant returns(address){
		return address(donationEndpoint);
	}

	function withdrawDonations()public onlyOwner{
		donationEndpoint.withdrawDonations(msg.sender);
	}

	function getRevenueEndpointAddress()public constant returns(address){
		return address(firstReceiver);
	}

// WeiReceivers:
	// receiver can be a splitter, fund or event task
	function setWeiReceiver(address _receiver) public {
		firstReceiver = IWeiReceiver(_receiver);
	}

///////////////////
	function() public {
		// non payable
	}
}

