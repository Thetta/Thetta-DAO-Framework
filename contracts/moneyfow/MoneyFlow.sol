pragma solidity ^0.4.15;

import "./IWeiReceiver.sol";
import "./IWeiSplitter.sol";
import "./IWeiDestination.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////
// WeiSplitter has multiple outputs (allows to send money only to THESE addresses)
// 
// TODO - avoid loops - https://github.com/Thetta/SmartContracts/issues/12
// TODO - many owners - https://github.com/Thetta/SmartContracts/issues/13
// 
contract WeiSplitter is IWeiSplitter, IWeiReceiver, Ownable {
	using SafeMath for uint;

	mapping (uint=>address) children;
	uint childrenCount = 0;

// IWeiSplitter:
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

// IWeiReceiver:
	// calculate only absolute outputs, but not take into account the Percents
	function getMinWeiNeeded()constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getMinWeiNeeded();
			total.add(needed);
		}
		return total;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(_inputWei);
			total.add(needed);

			// this should be reduced because next child can get only '_inputWei minus what prev. child got'
			if(_inputWei>needed){
				_inputWei-=needed;
			}else{
				_inputWei = 0;
			}
		}
		return total;
	}

	function getTotalPercentsDiv100Needed()constant public returns(uint){
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			total.add(c.getTotalPercentsDiv100Needed());	
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
	function()public payable{
		uint amount = msg.value;
		require(amount>=getMinWeiNeeded());

		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(children[i]);
			uint needed = c.getTotalWeiNeeded(amount);

			// send money. can throw!
			children[i].transfer(needed);

			// this should be reduced because next child can get only 'amount minus what prev. child got'
			if(amount>needed){
				amount-=needed;
			}else{
				amount = 0;
			}
		}
	}
}

//////////////////////////////////////////////////////
// This is a terminal item, that has no children
// This is one-time receive only
contract WeiAbsoluteTask is IWeiReceiver, IWeiDestination, Ownable {
	bool public isMoneyReceived = false;
	uint public neededWei = 0;

	function WeiAbsoluteTask(uint _neededWei)public {
		neededWei = _neededWei;	
	}

// IWeiDestination:
	// pull model
	function flush()public onlyOwner{
		msg.sender.transfer(msg.value);
	}

// IWeiReceiver:
	function getMinWeiNeeded()constant public returns(uint){
		// if already recevied -> then return 0
		if(!isNeedsMoney()){
			return 0;
		}
		return neededWei;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		return getMinWeiNeeded();
	}

	function getTotalPercentsDiv100Needed()constant public returns(uint){
		return 0;
	}

	function isNeedsMoney()constant public returns(bool){
		return !isMoneyReceived;
	}

	// receive money one time only
	function()public payable{
		require(!isNeedsMoney());
		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getMinWeiNeeded());
		isMoneyReceived = true;
	}
}

contract WeiRelativeTask is IWeiReceiver, IWeiDestination, Ownable {
	bool public isMoneyReceived = false;
	uint public percentsDiv100Needed = 0;

	function WeiRelativeTask(uint _percentsDiv100Needed)public {
		percentsDiv100Needed = _percentsDiv100Needed;
	}

// IWeiDestination:
	// pull model
	function flush()public onlyOwner{
		msg.sender.transfer(msg.value);
	}

// IWeiReceiver:
	function getMinWeiNeeded()constant public returns(uint){
		return 0;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		// calculate percents
		if(!isNeedsMoney()){
			return 0;
		}

		// TODO: calculate percents of _inputWei
		return 0; 
	}

	function getTotalPercentsDiv100Needed()constant public returns(uint){
		return percentsDiv100Needed;
	}

	function isNeedsMoney()constant public returns(bool){
		return !isMoneyReceived;
	}

	// receive money one time only
	function()public payable{
		require(!isNeedsMoney());
		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getMinWeiNeeded());
		isMoneyReceived = true;
	}
}

// TODO: 
contract WeiAbsoluteTaskWithPeriod {

}

// TODO: 
contract WeiRelativeTaskWithPeriod {

}

//////////////////////////////////////////////////////
// WeiFund can store funds until 'flush' is called (pull model)
// This is a terminal item, that has no children
contract WeiFund is IWeiReceiver, IWeiDestination, Ownable {
	address public output;

	// Process funds, send it to the Output
	function flush() public onlyOwner{
		// TODO: check for vulnerabilities
		output.transfer(msg.value);
	}

// IWeiReceiver:
	function getMinWeiNeeded()constant public returns(uint){
		// TODO:
		return 0;
	}
	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		// TODO:
		return 0;
	}
	function getTotalPercentsDiv100Needed()constant public returns(uint){
		// TODO:
		return 0;
	}
	function isNeedsMoney()constant public returns(bool){
		// TODO:
		return false;
	}

	// WeiFund accepts ETH from any address
	// WeiFund should hold funds until 'flush' is called
	function()public payable{}
}

