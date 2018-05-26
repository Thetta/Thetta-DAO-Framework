pragma solidity ^0.4.15;

import "./IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../IDaoBase.sol";

//////////////////////////////////////////////////////
contract Gate{
	// Simple Gate is open permanenlty; open/close implementation is for child;
	bool opened = true;
	address children = 0x0;
	IDaoBase mc;

	function Gate(IDaoBase _mc, address _children) public{
		children = _children;
		mc = _mc;
	}

	modifier isCanDo(string _what){
		require(mc.isCanDoAction(msg.sender,_what)); 
		_; 
	}

	function getChildren() public constant returns(address){
		return children;
	}

	function open() public isCanDo("openGate"){
		opened = true;
	}

	function closeIt() public isCanDo("closeGate"){
		opened = false;
	}

	function isOpen() public constant returns(bool){
		return opened;
	}

	function isNeedsMoney() public constant returns(bool){
		if(!isOpen()){
			return false;
		}else{
			IWeiReceiver c = IWeiReceiver(children);
			return c.isNeedsMoney();
		}
	}

	function getTotalWeiNeeded(uint _currentFlow) public constant returns(uint){
		if(!isOpen()){
			return 0;
		}else{
			IWeiReceiver c = IWeiReceiver(children);
			return c.getTotalWeiNeeded(_currentFlow);
		}
	}

	function getMinWeiNeeded() public constant returns(uint){
		if(!isOpen()){
			return 0;
		}else{
			IWeiReceiver c = IWeiReceiver(children);
			return c.getMinWeiNeeded();
		}
	}

	function processFunds(uint _currentFlow) public payable{
		require(isOpen());

		uint amount = _currentFlow;
		IWeiReceiver c = IWeiReceiver(children);
		uint needed = c.getTotalWeiNeeded(amount);
		c.processFunds.value(needed)(amount);
	}

	function() public {
	}
}