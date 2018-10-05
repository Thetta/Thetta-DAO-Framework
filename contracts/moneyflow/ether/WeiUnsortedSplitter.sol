pragma solidity ^0.4.23;

import "./SplitterBase.sol";


/**
 * @title WeiUnsortedSplitter 
 * @dev Will split money (order does not matter!). 
*/
contract WeiUnsortedSplitter is SplitterBase, IWeiReceiver {
	event ConsoleUint(string a, uint b);

	constructor(string _name) SplitterBase(_name) public {
	}

	// IWeiReceiver:
	// calculate only absolute outputs, but do not take into account the Percents
	function getMinWeiNeeded()public view returns(uint) {
		if(!isOpen()) {
			return 0;
		}

		uint absSum = 0;
		uint partsPerMillionReverseSum = 1000000;

		for(uint i=0; i<childrenCount; ++i) {
			if(0!=IWeiReceiver(children[i]).getPartsPerMillion()) {
				partsPerMillionReverseSum -= IWeiReceiver(children[i]).getPartsPerMillion();
			}else {
				absSum += IWeiReceiver(children[i]).getMinWeiNeeded();
			}
		}

		if(partsPerMillionReverseSum==0) {
			return 0;
		}else {
			return 1000000*absSum/partsPerMillionReverseSum;
		}		
	}

	function getTotalWeiNeeded(uint _inputWei)public view returns(uint) {
		if(!isOpen()) {
			return 0;
		}

		uint total = 0;
		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(_inputWei);
			total = total + needed;
		}
		return total;
	}

	function getPartsPerMillion()public view returns(uint) {
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			total = total + c.getPartsPerMillion();
		}

		// truncate, no more than 100% allowed!
		if(total>1000000) {
			return 1000000;
		}
		return total;
	}

	function isNeedsMoney()public view returns(bool) {
		if(!isOpen()) {
			return false;
		}

		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			// if at least 1 child needs money -> return true
			if(c.isNeedsMoney()) {
				return true;
			}
		}
		return false;
	}

	// WeiSplitter allows to receive money from ANY address
	// WeiSplitter should not hold any funds. Instead - it should split immediately
	// If WeiSplitter receives less or more money than needed -> exception 
	function processFunds(uint _currentFlow) public payable {
		require(isOpen());
		emit SplitterBaseProcessFunds(msg.sender, msg.value, _currentFlow);
		uint amount = msg.value;

		// TODO: can remove this line?
		// transfer below will throw if not enough money?
		require(amount>=getTotalWeiNeeded(_currentFlow));

		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(_currentFlow);

			// send money. can throw!
			// we sent needed money but specifying TOTAL amount of flow
			// this help relative Splitters to calculate how to split money
			if(needed>0) {
				c.processFunds.value(needed)(_currentFlow);
			}		
		}	

		if(this.balance>0) {
			revert();
		}	
	}

	function() public {
	}
}