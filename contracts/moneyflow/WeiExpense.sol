pragma solidity ^0.4.15;

import "./IWeiReceiver.sol";
import "./IWeiSplitter.sol";
import "./IWeiDestination.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////
// This is a terminal item, that has no children
// This is one-time receive only
contract WeiAbsoluteExpense is IWeiReceiver, IWeiDestination, Ownable {
	address public moneySource = 0x0;
	bool public isMoneyReceived = false;
	uint public neededWei = 0;

	modifier onlyByMoneySource() { 
		require(msg.sender==moneySource); 
		_; 
	}

	// _neededWei can be 0
	function WeiAbsoluteExpense(uint _neededWei) public {
		neededWei = _neededWei;	
	}

	function setNeededWei(uint _neededWei) public onlyOwner {
		neededWei = _neededWei;
	}

// IWeiDestination:
	// pull model
	function flush()public onlyOwner {
		msg.sender.transfer(this.balance);
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
	function processFunds(uint _currentFlow) public payable{
		require(isNeedsMoney());
		require(neededWei!=0);		// should be set

		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getMinWeiNeeded());
		isMoneyReceived = true;
		moneySource = msg.sender;
	}

	function()public{
	}
}

// TODO 
/*
contract WeiRelativeExpense is IWeiReceiver, IWeiDestination, Ownable {
	bool public isMoneyReceived = false;
	uint public percentsDiv100Needed = 0;

	function WeiRelativeExpense(uint _percentsDiv100Needed)public {
		percentsDiv100Needed = _percentsDiv100Needed;
	}

// IWeiDestination:
	// pull model
	function flush()public onlyOwner{
		msg.sender.transfer(this.balance);
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
	function processFunds(uint _currentFlow) public payable{
		require(!isNeedsMoney());
		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getMinWeiNeeded());
		isMoneyReceived = true;
	}

	function()public{
	}
}

// TODO: 
contract WeiAbsoluteExpenseWithPeriod {

}

// TODO: 
contract WeiRelativeExpenseWithPeriod {

}
*/

