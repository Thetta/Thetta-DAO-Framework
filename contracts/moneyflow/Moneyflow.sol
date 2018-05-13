pragma solidity ^0.4.15;
import "./IMoneyflow.sol";
import "./IWeiReceiver.sol";

import "./WeiSplitter.sol";

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

	// by default - this is 0x0, please use setWeiReceiver method
	// this can be a WeiSplitter (top-down or unsorted)
	IWeiReceiver public firstReceiver;

	function MoneyFlow()public{
		donationEndpoint = new DonationEndpoint();
	}

// IMoneyflow:
	function getDonationEndpointAddress()public constant returns(address){
		return address(donationEndpoint);
	}

	function withdrawDonations()public onlyOwner{
		donationEndpoint.withdrawDonations(msg.sender);
	}

	// WARNING: this can be 0x0!
	// Do not send money here!
	function getRevenueEndpointAddress()public constant returns(address){
		return address(firstReceiver);
	}

// WeiReceivers:
	// receiver can be a splitter, fund or event task
	// _receiver can be 0x0!
	function setWeiReceiver(address _receiver) public {
		firstReceiver = IWeiReceiver(_receiver);
	}

///////////////////
	function() public {
		// non payable
	}
}

// this contract should be used to automatically instantiate Default scheme for a microcompany:
// https://docs.google.com/document/d/15UOnXM_iPudD95m-UYBcYns-SeqM2ksDecjYhZrqybQ/edit?usp=sharing
//
// Root - top-down splitter 
//		Spends - unsorted splitter
//			Salaries - unsorted splitter 
//			Other - unsorted splitter 
//			Tasks - unsorted splitter
//		Bonuses - unsorted splitter
//		Rest - unsorted splitter
//			ReserveFund - fund 
//			DividendsFund - fund

contract DefaultMoneyflowScheme is WeiTopDownSplitter {
	function DefaultMoneyflowScheme() public {
		WeiUnsortedSplitter spends = new WeiUnsortedSplitter("spends");
		WeiUnsortedSplitter bonuses = new WeiUnsortedSplitter("bonuses");
		WeiUnsortedSplitter rest = new WeiUnsortedSplitter("rest");

		WeiUnsortedSplitter salaries = new WeiUnsortedSplitter("salaries");
		WeiUnsortedSplitter other = new WeiUnsortedSplitter("other");

		spends.addChild(salaries);
		spends.addChild(other);

		// This contract is itself a top down (Root) splitter
		// just call a 'processFunds(uint _currentFlow)' method and it will
		this.addChild(spends);
		this.addChild(bonuses);
		this.addChild(rest);

		//this.addChild(bonuses);
		//this.addChild(rest);
	}
}
