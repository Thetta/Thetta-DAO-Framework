pragma solidity ^0.4.15;

import "./IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////
// ISplitter has multiple outputs (allows to send money only to THESE addresses)
// 
contract WeiSplitterBase is ISplitter, Ownable {
	using SafeMath for uint;

	mapping (uint=>address) children;
	uint childrenCount = 0;

	string public name = "";

	function WeiSplitterBase(string _name) public {
		name = _name;
	}

// ISplitter:
	function getChildrenCount() public constant returns(uint){
		return childrenCount;
	}
	function getChild(uint _index) public constant returns(address){
		return children[_index];
	}
	function addChild(address _newChild) public onlyOwner {
		children[childrenCount] = _newChild;	
		childrenCount = childrenCount + 1;	
	}
}

contract WeiTopDownSplitter is WeiSplitterBase, IWeiReceiver {
	function WeiTopDownSplitter(string _name) WeiSplitterBase(_name) public {
	}

// IWeiReceiver:
	// calculate only absolute outputs, but do not take into account the Percents
	function getMinWeiNeeded()constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getMinWeiNeeded();
			total = total + needed;
		}
		return total;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(_inputWei);
			total = total + needed;

			// this should be reduced because next child can get only '_inputWei minus what prev. child got'
			if(_inputWei>needed){
				_inputWei-=needed;
			}else{
				_inputWei = 0;
			}
		}
		return total;
	}

	function getPercentsMul100()constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			total = total + c.getPercentsMul100();	
		}

		// truncate, no more than 100% allowed!
		if(total>10000){
			return 10000;
		}
		return total;
	}

	function isNeedsMoney()constant public returns(bool){
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			// if at least 1 child needs money -> return true
			if(c.isNeedsMoney()){
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
	function processFunds(uint _currentFlow) public payable{
		uint amount = _currentFlow;

		// TODO: can remove this line?
		// transfer below will throw if not enough money?
		require(amount>=getTotalWeiNeeded(_currentFlow));
		// ???
		//require(amount>=getMinWeiNeeded());

		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(amount);

			// send money. can throw!
			// we sent needed money but specifying TOTAL amount of flow
			// this help relative Splitters to calculate how to split money
			c.processFunds.value(needed)(amount);

			// this should be reduced because next child can get only 'amount minus what prev. child got'
			if(amount>=needed){
				amount = amount - needed;
			}else{
				amount = 0;
			}
		}
	}

	function() public {
	}
}


// 
contract WeiUnsortedSplitter is WeiSplitterBase, IWeiReceiver {
	function WeiUnsortedSplitter(string _name) WeiSplitterBase(_name) public {
	}

// IWeiReceiver:
	// calculate only absolute outputs, but do not take into account the Percents
	function getMinWeiNeeded()constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getMinWeiNeeded();
			total = total + needed;
		}
		return total;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(_inputWei);
			total = total + needed;
		}
		return total;
	}

	function getPercentsMul100()constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			total = total + c.getPercentsMul100();
		}

		// truncate, no more than 100% allowed!
		if(total>10000){
			return 10000;
		}
		return total;
	}

	function isNeedsMoney()constant public returns(bool){
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			// if at least 1 child needs money -> return true
			if(c.isNeedsMoney()){
				return true;
			}
		}
		return false;
	}

	// WeiSplitter allows to receive money from ANY address
	// WeiSplitter should not hold any funds. Instead - it should split immediately
	// If WeiSplitter receives less or more money than needed -> exception 
	function processFunds(uint _currentFlow) public payable{
		uint amount = msg.value;

		// TODO: can remove this line?
		// transfer below will throw if not enough money?
		require(amount>=getTotalWeiNeeded(_currentFlow));

		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(_currentFlow);

			// send money. can throw!
			// we sent needed money but specifying TOTAL amount of flow
			// this help relative Splitters to calculate how to split money
			c.processFunds.value(needed)(_currentFlow);
		}
	}

	function() public {
	}
}
