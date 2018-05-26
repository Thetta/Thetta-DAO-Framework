pragma solidity ^0.4.15;

import "../IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

//////////////////////////////////////////////////////
contract WeiExpense is IWeiReceiver, IDestination, Ownable {
	bool isMoneyReceived = false;
	bool isCalculateDebt = false;
	bool isPeriodic = false;
	uint percentsMul100 = 0;
	uint periodHours = 0;
	uint momentReceived = 0;
	uint neededWei = 0;
	address moneySource = 0x0;

	function WeiExpense(uint _neededWei, uint _percentsMul100, uint _periodHours, bool _isCalculateDebt, bool _isPeriodic) public {
		percentsMul100 = _percentsMul100;
		periodHours = _periodHours;
		neededWei = _neededWei;
		isCalculateDebt = _isCalculateDebt;
		isPeriodic = _isPeriodic;
	}

	function processFunds(uint _currentFlow) public payable{
		require(isNeedsMoney());

		require(msg.value==getTotalWeiNeeded(_currentFlow));

		if(isPeriodic){ // TODO: why not works without if
			momentReceived = uint(now);
		}

		isMoneyReceived = true;
		moneySource = msg.sender;
	}

	function getIsMoneyReceived() constant public returns(bool){
		return isMoneyReceived;
	}

	function getNeededWei() constant public returns(uint){
		return neededWei;
	}	

	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint){
		if(!isNeedsMoney()){
			return 0;
		}

		if(0!=percentsMul100){
			return (getDebtMultiplier()*(percentsMul100 * _inputWei)) / 10000;
		}else{
			return getMinWeiNeeded();
		}
	}

	function getMinWeiNeeded()constant public returns(uint){
		if(!isNeedsMoney() || (0!=percentsMul100)){
			return 0;
		}
		return getDebtMultiplier()*neededWei;
	}

	function getMomentReceived() constant public returns(uint){
		return momentReceived;
	}
		
	function getDebtMultiplier() constant public returns(uint){
		if((isCalculateDebt)&&(0!=momentReceived)){
			return ((now - momentReceived) / (periodHours * 3600 * 1000));	
		} else{
			return 1;
		}
	}

	function isNeedsMoney()constant public returns(bool){	
		if(isPeriodic){ // For period Weiexpense
			if ((uint64(now) - momentReceived) >= periodHours * 3600 * 1000){ 
				return true;
			}
		}else{
			return !isMoneyReceived;
		}
	}

	modifier onlyByMoneySource() { 
		require(msg.sender==moneySource); 
		_; 
	}
	
	function getPercentsMul100()constant public returns(uint){
		return percentsMul100;
	}

	// TODO: remove from here
	function getNow()constant public returns(uint){
		return now;
	}

	function flush()public onlyOwner{
		owner.transfer(this.balance);
	}

	function flushTo(address _to) public onlyOwner {
		revert();
	}

	function setNeededWei(uint _neededWei) public onlyOwner {
		neededWei = _neededWei;
	}
	
	function setPercents(uint _percentsMul100) public onlyOwner {
		percentsMul100 = _percentsMul100;
	}

	function()public{
	}
}

contract WeiAbsoluteExpense is WeiExpense {
	function WeiAbsoluteExpense(uint _neededWei) public 
		WeiExpense(_neededWei, 0, 0, false, false)
	{}
}

contract WeiRelativeExpense is WeiExpense {
	function WeiRelativeExpense(uint _percentsMul100)public 
		WeiExpense(0, _percentsMul100, 0, false, false)
	{}
}

contract WeiAbsoluteExpenseWithPeriod is WeiExpense { 
	function WeiAbsoluteExpenseWithPeriod(uint _neededWei, uint _periodHours, bool _isCalculateDebt) public
		WeiExpense(_neededWei, 0, _periodHours, _isCalculateDebt, true)
	{}
}

contract WeiRelativeExpenseWithPeriod is WeiExpense {
	function WeiRelativeExpenseWithPeriod(uint _percentsMul100, uint _periodHours, bool _isCalculateDebt) public 
		WeiExpense(0, _percentsMul100, _periodHours, _isCalculateDebt, true)
	{}
}
