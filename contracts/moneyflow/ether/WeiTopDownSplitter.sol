pragma solidity ^0.4.23;

import "./SplitterBase.sol";


/**
 * @title WeiTopDownSplitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract WeiTopDownSplitter is SplitterBase, IWeiReceiver {
	constructor(string _name) SplitterBase(_name) public {
	}

// IWeiReceiver:
	// calculate only absolute outputs, but do not take into account the Percents

	function getMinWeiNeeded()public view returns(uint) {
		if(!isOpen()) {
			return 0;
		}
		uint out = 0;
		for(uint j=childrenCount; j>0; --j) {
			IWeiReceiver c = IWeiReceiver(children[j-1]);
			if(c.getPpm()>0) {
				out = 1000000 * out / c.getPpm();
			}else {
				out += c.getMinWeiNeeded();
			}
		}
		return out;		
	}

	function getTotalWeiNeeded(uint _inputWei)public view returns(uint) {
		if(!isOpen()) {
			return 0;
		}
		
		uint inputWei = _inputWei;
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(inputWei);
			total = total + needed;

			// this should be reduced because next child can get only '_inputWei minus what prev. child got'
			if(inputWei>needed) {
				inputWei-=needed;
			}else {
				inputWei = 0;
			}
		}
		return total;
	}

	function getPpm()public view returns(uint) {
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			total = total + c.getPpm();	
		}

		// truncate, no more than 100% allowed!
		if(total>1000000) {
			return 1000000;
		}
		return total;
	}

	function isNeedsMoney()view public returns(bool) {
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
	// 
	// TODO: this can be optimized, no need to traverse other hierarchy step 
	// we can get the 'terminal' items and send money DIRECTLY FROM the signle source
	// this will save gas 
	// See this - https://github.com/Thetta/SmartContracts/issues/40
	function processFunds(uint _currentFlow) public payable {
		require(isOpen());
		emit SplitterBaseProcessFunds(msg.sender, msg.value, _currentFlow);
		uint amount = _currentFlow;

		// TODO: can remove this line?
		// transfer below will throw if not enough money?
		require(amount>=getTotalWeiNeeded(_currentFlow));
		// ???
		// require(amount>=_getMinWeiNeeded());

		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		for(uint i=0; i<childrenCount; ++i) {
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(amount);

			// send money. can throw!
			// we sent needed money but specifying TOTAL amount of flow
			// this help relative Splitters to calculate how to split money
			if(needed>0) {
				c.processFunds.value(needed)(amount);

				// this should be reduced because next child can get only 'amount minus what prev. child got'
				if(amount>=needed) {
					amount = amount - needed;
				}else {
					amount = 0;
				}
			}
		}

		if(this.balance>0) {
			revert();
		}
	}

	function() public {
	}
}