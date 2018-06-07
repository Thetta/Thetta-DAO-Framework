pragma solidity ^0.4.22;

import "./IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../IDaoBase.sol";

/**
 * @title Gate (wei)
 * @dev Opens or closes the moneyflow
*/
contract Gate is Ownable, IWeiReceiver{
	// Simple Gate is open permanenlty; open/close implementation is for child;
	bool opened = true;
	IWeiReceiver child;
	IDaoBase dao;

	constructor(IDaoBase _dao, address _child) public{
		child = IWeiReceiver(_child);
		dao = _dao;
	}

	function getPercentsMul100()view external returns(uint){
		revert();
	}

	// TODO: this method is not provided in any interface 
	// should be removed
	function getChild() external view returns(IWeiReceiver){
		return child;
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

	function _isOpen() internal view returns(bool){
		return opened;
	}

	function isNeedsMoney() view external returns(bool){
		if(!_isOpen()){
			return false;
		}else{
			IWeiReceiver c = IWeiReceiver(child);
			return c.isNeedsMoney();
		}
	}

	function getTotalWeiNeeded(uint _currentFlow) view external returns(uint){
		if(!_isOpen()){
			return 0;
		}else{
			IWeiReceiver c = IWeiReceiver(child);
			return c.getTotalWeiNeeded(_currentFlow);
		}
	}

	function getMinWeiNeeded() view external returns(uint){
		if(!_isOpen()){
			return 0;
		}else{
			IWeiReceiver c = IWeiReceiver(child);
			return c.getMinWeiNeeded();
		}
	}

	function processFunds(uint _currentFlow) external payable{
		require(_isOpen());

		uint amount = _currentFlow;
		IWeiReceiver c = IWeiReceiver(child);
		uint needed = c.getTotalWeiNeeded(amount);
		c.processFunds.value(needed)(amount);
	}

	// use processFunds instead
	function() public {
		revert();
	}
}
