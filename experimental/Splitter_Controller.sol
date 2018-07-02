pragma solidity ^0.4.15;

import "./moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title SplitterBase
 * @dev Splitter has multiple outputs (allows to send money only to THESE addresses)
*/

contract IWeiReceiverSimple{
	function isSimpleWeiReceiverType() external view returns(bool);
	function getChildren() external view returns(address[]);
}

contract SplitterSimple{
	address[] children;

	constructor(address[] _children) public{
		children = _children;
	}

	function isSimpleWeiReceiverType() external view returns(bool){
		return true;
	}

	function getChildren() external view returns(address[]){
		return children;
	}
}

contract SplitterController{
	// function _isOpen(address stor) internal view returns(bool){
	// 	return SplitterSimple(stor).opened();
	// }

	// function isOpen(address stor) external view returns(bool){
	// 	return SplitterSimple(stor).opened();
	// }

	function getChildrenCount(address stor)external view returns(uint){
		return SplitterSimple(stor).getChildren().length;
	}

	function getChild(address stor, uint _index)external view returns(address){
		return SplitterSimple(stor).getChildren()[_index];
	}

	function getChildren(address stor)public view returns(address[]){
		return SplitterSimple(stor).getChildren();
	}

	function getMinWeiNeeded(address stor)external view returns(uint){
		return _getMinWeiNeeded(stor);
	}

	function _getMinWeiNeeded(address stor)internal view returns(uint){
		// if(!_isOpen(msg.sender)){
		// 	return 0;
		// }
		address[] memory children = getChildren(stor);
		uint total = 0;
		uint needed;
		for(uint i=0; i<children.length; ++i){
			if(IWeiReceiverSimple(children[i]).isSimpleWeiReceiverType()){
				needed = _getMinWeiNeeded(stor);
			}else{
				needed = IWeiReceiver(children[i]).getMinWeiNeeded();
			}
			total = total + needed;
		}
		return total;
	}

	function getTotalWeiNeeded(address stor, uint _inputWei)external view returns(uint){
		return _getTotalWeiNeeded(stor, _inputWei);
	}

	function _getTotalWeiNeeded(address stor, uint _inputWei)internal view returns(uint){
		// if(!_isOpen(msg.sender)){
		// 	return 0;
		// }

		address[] memory children = getChildren(stor);
		uint needed;
		uint total = 0;
		for(uint i=0; i<children.length; ++i){
			if(IWeiReceiverSimple(children[i]).isSimpleWeiReceiverType()){
				needed = _getTotalWeiNeeded(children[i], _inputWei);
			}else{
				needed = IWeiReceiver(children[i]).getTotalWeiNeeded(_inputWei);
			}
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

	function getPercentsMul100(address stor)external view returns(uint){
		return _getPercentsMul100(stor);
	}

	function _getPercentsMul100(address stor)internal view returns(uint){
		uint total = 0;
		address[] memory children = getChildren(msg.sender);
		for(uint i=0; i<children.length; ++i){
			if(IWeiReceiverSimple(children[i]).isSimpleWeiReceiverType()){
				total = total + _getPercentsMul100(stor);
			}else{
				total = total + IWeiReceiver(children[i]).getPercentsMul100();
			}
		}
		// truncate, no more than 100% allowed!
		if(total>10000){
			return 10000;
		}
		return total;
	}

	function isNeedsMoney(address stor)external view returns(bool){
		return _isNeedsMoney(stor);
	}

	function _isNeedsMoney(address stor)internal view returns(bool){
		address[] memory children = getChildren(msg.sender);
		/*if(!_isOpen(msg.sender)){
			return false;
		}*/

		for(uint i=0; i<children.length; ++i){
			if(IWeiReceiverSimple(children[i]).isSimpleWeiReceiverType()){
				return _isNeedsMoney(stor);
			}else{
				if(IWeiReceiver(children[i]).isNeedsMoney()){
					return true;
				}
			}
		}
		return false;
	}

	function processFunds(uint _currentFlow) external payable{
		address[] memory children = getChildren(msg.sender);
		// require(_isOpen(msg.sender));
		// emit SplitterBase_ProcessFunds(msg.sender, msg.value, _currentFlow);
		uint amount = _currentFlow;
		uint needed;

		// require(amount>=_getTotalWeiNeeded(stor, _currentFlow));

		for(uint i=0; i<children.length; ++i){

			if(IWeiReceiverSimple(children[i]).isSimpleWeiReceiverType()){
				needed = _getTotalWeiNeeded(children[i], amount);
			}else{
				needed = IWeiReceiver(children[i]).getTotalWeiNeeded(amount);
			}

			IWeiReceiver(children[i]).processFunds.value(needed)(amount);

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