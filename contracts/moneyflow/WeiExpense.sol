pragma solidity ^0.4.15;

import "./IWeiReceiver.sol";
import "./IWeiSplitter.sol";
import "./IWeiDestination.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////
	// This is a terminal item, that has no children
	// This is one-time receive only

contract Expense is IWeiReceiver, IWeiDestination, Ownable {
	bool public isMoneyReceived = false;
	// uint public need = 0;
	uint public percentsMul100 = 10000;

	function flush()public onlyOwner{
		msg.sender.transfer(this.balance);
	}

	function flushTo(address _to) public onlyOwner {
		revert();
	}

	function getPercentsMul100()constant public returns(uint){
		return percentsMul100;
	}

	function()public{
	}
}

contract WeiAbsoluteExpense is Expense {
	address public moneySource = 0x0;
	
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
}

contract WeiRelativeExpense is Expense {
	
	uint public percentsMul100 = 0;

	function WeiRelativeExpense(uint _percentsMul100)public {
		percentsMul100 = _percentsMul100;
	}

	function setPercents(uint _percentsMul100) public onlyOwner {
		percentsMul100 = _percentsMul100;
	}

	// IWeiDestination:
	// pull model

	// IWeiReceiver:
	function getMinWeiNeeded()constant public returns(uint){
		return 0;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		// calculate percents
		if(!isNeedsMoney()){
			return 0;
		}
		return (getPercentsMul100() * _inputWei) / 10000;
	}



	function isNeedsMoney()constant public returns(bool){
		return !isMoneyReceived;
	}

	// receive money one time only
	function processFunds(uint _currentFlow) public payable{
		require(isNeedsMoney());
		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getTotalWeiNeeded(_currentFlow));
		isMoneyReceived = true;
	}
}

contract WeiAbsoluteExpenseWithPeriod is Expense{
	uint public periodHours = 0;
	uint public momentReceived;
	uint public neededWei = 0;
	address public moneySource = 0x0;
	
	function WeiAbsoluteExpenseWithPeriod(uint _neededWei, uint _periodHours) public {
		neededWei = _neededWei;	
		periodHours = _periodHours;
		momentReceived = now;
	}

	function getNow()constant public returns(uint){
		return now;
	}

	function getMomentReceived()constant public returns(uint){
		return momentReceived;
	}

	function isNeedsMoney()constant public returns(bool){	
		if((now - momentReceived) >= periodHours * 3600 * 1000){
			return true;
		}else{
			return !isMoneyReceived;	
		}	
	}

	function processFunds(uint _currentFlow) public payable{
		require(isNeedsMoney());
		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getTotalWeiNeeded(_currentFlow));
		isMoneyReceived = true;
		momentReceived = now;
		moneySource = msg.sender;
	}

	modifier onlyByMoneySource() { 
		require(msg.sender==moneySource); 
		_; 
	}

	function setNeededWei(uint _neededWei) public onlyOwner {
		neededWei = _neededWei;
	}

	// IWeiDestination:


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
}

contract WeiRelativeExpenseWithPeriod is Expense {
	uint public periodHours = 0;
	uint public momentReceived;
	
	uint public percentsMul100 = 0;

	function WeiRelativeExpenseWithPeriod(uint _percentsMul100, uint _periodHours) public {
		percentsMul100 = _percentsMul100;
		periodHours = _periodHours;
	}

	function isNeedsMoney()constant public returns(bool){	
		if ((now - momentReceived) >= periodHours * 3600 * 1000){
			return true;
		}

		return !isMoneyReceived;
	}

	function processFunds(uint _currentFlow) public payable{
		require(isNeedsMoney());
		// DO NOT SEND LESS!
		// DO NOT SEND MORE!
		require(msg.value==getTotalWeiNeeded(_currentFlow));
		isMoneyReceived = true;
		momentReceived = now;
	}

	function setPercents(uint _percentsMul100) public onlyOwner {
		percentsMul100 = _percentsMul100;
	}

	// IWeiDestination:


	// IWeiReceiver:
	function getMinWeiNeeded()constant public returns(uint){
		return 0;
	}

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		// calculate percents
		if(!isNeedsMoney()){
			return 0;
		}
		return (getPercentsMul100() * _inputWei) / 10000;
	}
}
