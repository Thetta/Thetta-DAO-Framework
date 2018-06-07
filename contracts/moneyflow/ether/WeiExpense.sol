pragma solidity ^0.4.15;

import "../IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title WeiExpense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive Wei.
*/
contract WeiExpense is IWeiReceiver, IDestination, Ownable {
	bool isMoneyReceived = false;
	bool isCalculateDebt = false;
	bool isPeriodic = false;
	uint percentsMul100 = 0;
	uint periodHours = 0;
	uint momentReceived = 0;
	uint neededWei = 0;
	address moneySource = 0x0;

    /**
    * @dev Constructor
    * @param _neededWei - absolute value. how much Ether this expense should receive (in Wei). Can be zero (use _percentsMul100 in this case)
    * @param _percentsMul100 - if need to get % out of the input flow -> specify this parameter (1% is 100 units)
    * @param _periodHours - TODO 
    * @param _isCalculateDebt - if you don't pay in the current period -> will accumulate the needed amount (only for _neededWei!)
    * @param _isPeriodic - TODO 
    */
	constructor(uint _neededWei, uint _percentsMul100, uint _periodHours, bool _isCalculateDebt, bool _isPeriodic) public {
		percentsMul100 = _percentsMul100;
		periodHours = _periodHours;
		neededWei = _neededWei;
		isCalculateDebt = _isCalculateDebt;
		isPeriodic = _isPeriodic;
	}

	function processFunds(uint _currentFlow) public payable{
		require(isNeedsMoney());

		require(msg.value==getTotalWeiNeeded(_currentFlow));

		// TODO: why not working without if????
		if(isPeriodic){ 
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
	constructor(uint _neededWei) public 
		WeiExpense(_neededWei, 0, 0, false, false)
	{}
}

contract WeiRelativeExpense is WeiExpense {
	constructor(uint _percentsMul100)public 
		WeiExpense(0, _percentsMul100, 0, false, false)
	{}
}

contract WeiAbsoluteExpenseWithPeriod is WeiExpense { 
	constructor(uint _neededWei, uint _periodHours, bool _isCalculateDebt) public
		WeiExpense(_neededWei, 0, _periodHours, _isCalculateDebt, true)
	{}
}

contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint _percentsMul100, uint _periodHours, bool _isCalculateDebt) public 
		WeiExpense(0, _percentsMul100, _periodHours, _isCalculateDebt, true)
	{}
}
