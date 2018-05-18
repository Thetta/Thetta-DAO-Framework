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
		isMoneyReceived = false;
		msg.sender.transfer(this.balance);
	}

	function flushTo(address _to) public {
		revert();
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

contract WeiRelativeExpense is IWeiReceiver, IWeiDestination, Ownable {
	bool public isMoneyReceived = false;
	uint public percentsDiv100Needed = 0;

	function WeiRelativeExpense(uint _percentsDiv100Needed)public {
		percentsDiv100Needed = _percentsDiv100Needed;
	}

	function setPercents(uint _percentsDiv100Needed) public onlyOwner {
		percentsDiv100Needed = _percentsDiv100Needed;
	}

// IWeiDestination:
	// pull model
	function flush()public onlyOwner{
		isMoneyReceived = false;
		msg.sender.transfer(this.balance);
	}

	function flushTo(address _to) public onlyOwner {
		revert();
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
		return (getTotalPercentsDiv100Needed() * _inputWei) / 10000;
	}

	function getTotalPercentsDiv100Needed()constant public returns(uint){
		return percentsDiv100Needed;
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

	function()public{
	}
}


contract WeiAbsoluteExpenseWithPeriod is  IWeiReceiver, IWeiDestination, Ownable{
	uint public periodHours = 0;
	uint public momentReceived;
	uint public neededWei = 0;
	address public moneySource = 0x0;
	bool public isMoneyReceived = false;

	function flush()public onlyOwner{
		msg.sender.transfer(this.balance);
	}
	
	function WeiAbsoluteExpenseWithPeriod(uint _neededWei, uint _periodHours) public {
		neededWei = _neededWei;	
		periodHours = _periodHours;
		momentReceived = now;
	}

	function isNeedsMoney()constant public returns(bool){	
		if((now - momentReceived) >= periodHours * 1000 * 3600){
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

	function flushTo(address _to) public {
		revert();
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

	function()public{
	}
}

contract WeiRelativeExpenseWithPeriod is   IWeiReceiver, IWeiDestination, Ownable{
	uint public periodHours = 0;
	uint public momentReceived;

	function flush()public onlyOwner{
		msg.sender.transfer(this.balance);
	}

	function WeiRelativeExpenseWithPeriod(uint _percentsDiv100Needed, uint _periodHours) public {
		percentsDiv100Needed = _percentsDiv100Needed;
		periodHours = _periodHours;
	}

	function isNeedsMoney()constant public returns(bool){	
		if ((now - momentReceived) >= periodHours * 3600){
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

	bool public isMoneyReceived = false;
	uint public percentsDiv100Needed = 0;

	function setPercents(uint _percentsDiv100Needed) public onlyOwner {
		percentsDiv100Needed = _percentsDiv100Needed;
	}

// IWeiDestination:

	function flushTo(address _to) public onlyOwner {
		revert();
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
		return (getTotalPercentsDiv100Needed() * _inputWei) / 10000;
	}

	function getTotalPercentsDiv100Needed()constant public returns(uint){
		return percentsDiv100Needed;
	}

	function()public{
	}


}
