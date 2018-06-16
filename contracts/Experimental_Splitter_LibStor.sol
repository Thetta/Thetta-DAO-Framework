pragma solidity ^0.4.15;

import "./moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title SplitterBase 
 * @dev Splitter has multiple outputs (allows to send money only to THESE addresses)
*/

contract Splitter{
	using SplitterLib for SplitterLib.SplitterStorage;
	SplitterLib.SplitterStorage stor;

	constructor(address[] _children) public{
		stor.children = _children;
		stor.opened = true;
	}

	function getChildren() external returns(address[]){
		return stor.children;
	}

	function setStatus(bool _isOpen) external{
		stor.opened = _isOpen;
	}

	function processFunds(uint _currentFlow) external payable{
		uint prevAmount = _currentFlow;
		address receiver;
		uint needed;
		uint amount;
		for(uint i=0; i<stor.getChildrenCount(); ++i){
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
}

library SplitterLib{
	struct SplitterStorage{
		address[] children;
		bool opened;
	}

	struct FundReceiver{
		address receiver;
		uint needed;
		uint amount;
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
		return self.children.length;
	}

	function getChild(SplitterStorage storage self, uint _index)external view returns(address){
		return self.children[_index];
	}

	function getChildren(SplitterStorage storage self)public view returns(address[]){
		return self.children;
	}

	function getMinWeiNeeded(SplitterStorage storage self)external view returns(uint){
		if(!self.opened){
			return 0;
		}
		// address[] memory children = getChildren(msg.sender);
		uint total = 0;
		for(uint i=0; i<self.children.length; ++i){
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

		// address[] memory children = getChildren(msg.sender);

		uint total = 0;
		for(uint i=0; i<self.children.length; ++i){
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
		// address[] memory children = getChildren(msg.sender);
		for(uint i=0; i<self.children.length; ++i){
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
		// address[] memory children = getChildren(msg.sender);
		if(!self.opened){
			return false;
		}

		for(uint i=0; i<self.children.length; ++i){
			IWeiReceiver c = IWeiReceiver(self.children[i]);
			// if at least 1 child needs money -> return true
			if(c.isNeedsMoney()){
				return true;
			}
		}
		return false;
	}
}
