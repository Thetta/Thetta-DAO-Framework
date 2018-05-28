pragma solidity ^0.4.15;

import "./IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../IDaoBase.sol";

//////////////////////////////////////////////////////
contract Gate is Ownable, IWeiReceiver{
	// Simple Gate is open permanenlty; open/close implementation is for child;
	bool opened = true;
	IWeiReceiver child;
	IDaoBase mc;

	function Gate(IDaoBase _mc, address _child) public{
		child = IWeiReceiver(_child);
		mc = _mc;
	}

	function getPercentsMul100()constant public returns(uint){
		revert();
	}

	function getChild() public constant returns(IWeiReceiver){
		return child;
	}

	function open() public onlyOwner{
		opened = true;
	}

	function close() public onlyOwner{
		opened = false;
	}

	function isOpen() public constant returns(bool){
		return opened;
	}

	function isNeedsMoney() constant public returns(bool){
		if(!isOpen()){
			return false;
		}else{
			IWeiReceiver c = IWeiReceiver(child);
			return c.isNeedsMoney();
		}
	}

	function getTotalWeiNeeded(uint _currentFlow) constant public returns(uint){
		if(!isOpen()){
			return 0;
		}else{
			IWeiReceiver c = IWeiReceiver(child);
			return c.getTotalWeiNeeded(_currentFlow);
		}
	}

	function getMinWeiNeeded() constant public returns(uint){
		if(!isOpen()){
			return 0;
		}else{
			IWeiReceiver c = IWeiReceiver(child);
			return c.getMinWeiNeeded();
		}
	}

	function processFunds(uint _currentFlow) public payable{
		require(isOpen());

		uint amount = _currentFlow;
		IWeiReceiver c = IWeiReceiver(child);
		uint needed = c.getTotalWeiNeeded(amount);
		c.processFunds.value(needed)(amount);
	}

	function() public {
	}
}