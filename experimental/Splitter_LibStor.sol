pragma solidity ^0.4.15;

import "./moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title SplitterBase 
 * @dev Splitter has multiple outputs (allows to send money only to THESE addresses)
*/

contract Splitter is ISplitter, Ownable{
	using SplitterLib for SplitterLib.SplitterStorage;
	SplitterLib.SplitterStorage stor;
	event SplitterBase_ProcessFunds(address _sender, uint _value, uint _currentFlow);
	event SplitterBase_Open(address _sender);
	event SplitterBase_Close(address _sender);
	event SplitterBase_AddChild(address _newChild);

	constructor(string _name) public{
		stor.name = _name;
		stor.opened = true;
	}

	function open() external{
		stor.open();
	}

	function close() external{
		stor.close();
	}

	function isOpen() external view returns(bool){
		return stor.opened;
	}	

	function processFunds(uint _currentFlow) external payable{
		SplitterBase_ProcessFunds(msg.sender, msg.value, _currentFlow);
		uint prevAmount = _currentFlow;
		address receiver;
		uint needed;
		uint amount;
		for(uint i=0; i<stor.childrenCount; ++i){
			(receiver, needed, amount) = stor.getFundReceiverArray(_currentFlow, i, prevAmount);
			IWeiReceiver(receiver).processFunds.value(needed)(amount);
			prevAmount = amount;
		}
	}

	function getMinWeiNeeded() external returns(uint){
		return stor.getMinWeiNeeded();
	}

	function getTotalWeiNeeded(uint _currentFlow) external returns(uint){
		return stor.getTotalWeiNeeded(_currentFlow);
	}

	function isNeedsMoney() external returns(bool){
		return stor.isNeedsMoney();
	}

	function getChildrenCount()external view returns(uint){
		return stor.childrenCount;
	}

	function getChild(uint _index)external view returns(address){
		return stor.children[_index];
	}

	function addChild(address _newChild) external onlyOwner{
		stor.addChild(_newChild);
	}

	function getPercentsMul100() external view returns(uint){
		return stor.getPercentsMul100();
	}	
}

library SplitterLib{
	event SplitterBase_Open(address _sender);
	event SplitterBase_Close(address _sender);
	event SplitterBase_AddChild(address _newChild);

	struct SplitterStorage{
		mapping (uint=>address) children;
		uint childrenCount;
		bool opened;
		string name;
	}

	struct FundReceiver{
		address receiver;
		uint needed;
		uint amount;
	}

	function addChild(SplitterStorage storage self, address _newChild) external{
		emit SplitterBase_AddChild(_newChild);
		self.children[self.childrenCount] = _newChild;
		self.childrenCount += 1;	
	}	

	function open(SplitterStorage storage self) external{
		emit SplitterBase_Open(msg.sender);
		self.opened = true;
	}

	function close(SplitterStorage storage self) external{
		emit SplitterBase_Close(msg.sender);
		self.opened = false;
	}		

	function getFundReceiverArray(SplitterStorage storage self, uint _currentFlow, uint _iter, uint _amount) external view returns(address, uint, uint){
		uint amount = _amount;
		
		require(amount>=_getTotalWeiNeeded(self, _currentFlow));
			
		IWeiReceiver c = IWeiReceiver(self.children[_iter]);
		uint needed = c.getTotalWeiNeeded(amount);

		if(_currentFlow>=needed){
			amount = amount - needed;
		}else{
			amount = 0;
		}

		return (self.children[_iter], needed, amount);
	}

	function _isOpen(SplitterStorage storage self) internal view returns(bool){
		return self.opened;
	}

	function isOpen(SplitterStorage storage self) external view returns(bool){
		return self.opened;
	}

	function getChildrenCount(SplitterStorage storage self)external view returns(uint){
		return self.childrenCount;
	}

	function getChild(SplitterStorage storage self, uint _index)external view returns(address){
		return self.children[_index];
	}

	function getMinWeiNeeded(SplitterStorage storage self)external view returns(uint){
		if(!self.opened){
			return 0;
		}
		uint total = 0;
		for(uint i=0; i<self.childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(self.children[i]);
			uint needed = c.getMinWeiNeeded();
			total = total + needed;
		}
		return total;
	}

	function getTotalWeiNeeded(SplitterStorage storage self, uint _inputWei)external view returns(uint){
		return _getTotalWeiNeeded(self, _inputWei);
	}

	function _getTotalWeiNeeded(SplitterStorage storage self, uint _inputWei)internal view returns(uint){
		if(!self.opened){
			return 0;
		}

		uint total = 0;
		for(uint i=0; i<self.childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(self.children[i]);
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

	function getPercentsMul100(SplitterStorage storage self)external view returns(uint){
		uint total = 0;
		for(uint i=0; i<self.childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(self.children[i]);
			total = total + c.getPercentsMul100();	
		}

		// truncate, no more than 100% allowed!
		if(total>10000){
			return 10000;
		}
		return total;
	}

	function isNeedsMoney(SplitterStorage storage self)external view returns(bool){
		if(!self.opened){
			return false;
		}

		for(uint i=0; i<self.childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(self.children[i]);
			if(c.isNeedsMoney()){
				return true;
			}
		}
		return false;
	}
}
