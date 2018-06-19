pragma solidity ^0.4.15;

import "./moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title SplitterBase 
 * @dev Splitter has multiple outputs (allows to send money only to THESE addresses)
*/

contract SplitterStorage is ISplitter, Ownable{
	mapping (uint=>address) children;

	uint childrenCount = 0;

	address main;
	bool public opened = true;
	string name;

	event SplitterBase_AddChild(address _newChild);

	constructor(address _main, string _name) public{
		name = _name;
		main = _main;
	}

	function addChild(address _newChild) external{
		emit SplitterBase_AddChild(_newChild);
		children[childrenCount] = _newChild;
		childrenCount += 1;	
	}

	function processFunds(uint _currentFlow) external payable{
		SplitterMain(main).processFunds.value(msg.value)(_currentFlow);
	}

	function getMinWeiNeeded() external returns(uint){
		return SplitterMain(main).getMinWeiNeeded();
	}

	function getTotalWeiNeeded(uint _currentFlow) external returns(uint){
		return SplitterMain(main).getTotalWeiNeeded(_currentFlow);
	}

	function isNeedsMoney() external returns(bool){
		return SplitterMain(main).isNeedsMoney();
	}	

	function open() external onlyOwner{
		opened = true;
	}

	function close() external onlyOwner{
		opened = false;
	}

	function isOpen() external view returns(bool){
		return opened;
	}	

	function getChildrenCount()external view returns(uint){
		return childrenCount;
	}

	function getChild(uint _index)external view returns(address){
		return children[_index];
	}

	function getPercentsMul100() external view returns(uint){
		return SplitterMain(main).getPercentsMul100();
	}	
}

contract SplitterMain{
	event SplitterBase_ProcessFunds(address _sender, uint _value, uint _currentFlow);
	event SplitterBase_Open(address _sender);
	event SplitterBase_Close(address _sender);

	function _isOpen(address stor) internal view returns(bool){
		return SplitterStorage(stor).opened();
	}

	function isOpen(address stor) external view returns(bool){
		return SplitterStorage(stor).opened();
	}

	function getChildrenCount(address stor)public view returns(uint){
		return SplitterStorage(stor).getChildrenCount();
	}

	function getChild(address stor, uint _index)public view returns(address){
		return SplitterStorage(stor).getChild(_index);
	}

	function getMinWeiNeeded()external view returns(uint){
		if(!_isOpen(msg.sender)){
			return 0;
		}
		uint childrenCount = getChildrenCount(msg.sender);
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(getChild(msg.sender,i));
			uint needed = c.getMinWeiNeeded();
			total = total + needed;
		}
		return total;
	}	

	function getTotalWeiNeeded(uint _inputWei)external view returns(uint){
		return _getTotalWeiNeeded(_inputWei);
	}

	function _getTotalWeiNeeded(uint _inputWei)internal view returns(uint){
		if(!_isOpen(msg.sender)){
			return 0;
		}
		uint childrenCount = getChildrenCount(msg.sender);
		uint total = 0;
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(getChild(msg.sender,i));
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

	function getPercentsMul100()external view returns(uint){
		uint total = 0;
		uint childrenCount = getChildrenCount(msg.sender);
		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(getChild(msg.sender,i));
			total = total + c.getPercentsMul100();	
		}

		// truncate, no more than 100% allowed!
		if(total>10000){
			return 10000;
		}
		return total;
	}

	function isNeedsMoney()constant public returns(bool){
		uint childrenCount = getChildrenCount(msg.sender);
		if(!_isOpen(msg.sender)){
			return false;
		}

		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(getChild(msg.sender,i));
			// if at least 1 child needs money -> return true
			if(c.isNeedsMoney()){
				return true;
			}
		}
		return false;
	}

	function processFunds(uint _currentFlow) external payable{
		uint childrenCount = getChildrenCount(msg.sender);
		require(_isOpen(msg.sender));
		// emit SplitterBase_ProcessFunds(msg.sender, msg.value, _currentFlow);
		uint amount = _currentFlow;

		require(amount>=_getTotalWeiNeeded(_currentFlow));

		for(uint i=0; i<childrenCount; ++i){
			IWeiReceiver c = IWeiReceiver(getChild(msg.sender,i));
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