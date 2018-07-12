pragma solidity ^0.4.21;

import "../IMoneyflow.sol";

import "./WeiExpense.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title WeiFund 
 * @dev WeiFund stores funds until 'flush' is called (pull model)
 * This is a terminal item, that has no children.
*/

contract NewWeiFund is IWeiReceiver, IDestination, Ownable {//
	using SafeMath for uint;

	uint neededWei;
	uint totalWeiReceived;
	uint momentReceived;
	uint balanceOnMomentReceived;
	uint momentCreated;

	bool isPeriodic;
	bool isAccumulateDebt;
	uint periodHours;

	event WeiFund_FlushTo(address _to, uint _balance);
	event consoleUint(string a, uint b);

	constructor(uint _neededWei, bool _isPeriodic, bool _isAccumulateDebt, uint _periodHours) public {
		require(!((_isAccumulateDebt)&&(_periodHours==0)));
		require(!(!(_isPeriodic)&&(_periodHours!=0)));
		require(!((_isAccumulateDebt)&&(!_isPeriodic)));
		require(_neededWei!=0);
		neededWei = _neededWei;
		isPeriodic = _isPeriodic;
		isAccumulateDebt = _isAccumulateDebt;
		periodHours = _periodHours;
		momentCreated = now;
	}

	function getTotalFundNeededAmount()external view returns(uint){
		return neededWei;
	}

	function _getTotalWeiNeeded(uint _inputWei)internal view returns(uint){
		uint need;
		emit consoleUint('_getDebtMultiplier()*neededWei', _getDebtMultiplier()*neededWei);
		emit consoleUint('totalWeiReceived', totalWeiReceived);
		emit consoleUint('_getDebtMultiplier()*neededWei - totalWeiReceived', _getDebtMultiplier()*neededWei - totalWeiReceived);
		if(_getDebtMultiplier()*neededWei > totalWeiReceived){
			need = _getDebtMultiplier()*neededWei - totalWeiReceived;	
		}else{
			need = 0;
		}

		emit consoleUint('need', need);
		emit consoleUint('_inputWei', _inputWei);
		if(need<=_inputWei){
			return need;
		}else{
			return _inputWei;
		}
	}

	function getDebtMultiplier()external view returns(uint){
		return _getDebtMultiplier();
	}

	function _getDebtMultiplier()internal view returns(uint){

		if((isPeriodic)&&(!isAccumulateDebt)&&( (now - momentReceived) / (periodHours * 3600 * 1000) >=1)){
			return (balanceOnMomentReceived/neededWei) + 1;
		} else if((isPeriodic)&&(isAccumulateDebt)){
			return 1 + ((now - momentCreated) / (periodHours * 3600 * 1000));
		}else{
			return 1;
		}
	}

	// -------------- IWeiReceiver

	function processFunds(uint _currentFlow) external payable{
		// emit consoleUint('_getDebtMultiplier', _getDebtMultiplier());
		require(totalWeiReceived+msg.value<=_getDebtMultiplier()*neededWei); // protect from extra money
		require(msg.value==_currentFlow);	
		totalWeiReceived += msg.value;
		if(_getTotalWeiNeeded(_currentFlow)==0){
			momentReceived = now;
			balanceOnMomentReceived = totalWeiReceived;
		}	
	}

	function getTotalWeiNeeded(uint _inputWei)external view returns(uint){
		return _getTotalWeiNeeded(_inputWei);
	}

	function getMinWeiNeeded()external view returns(uint){
		return 0;
	}

	function getPercentsMul100() view external returns(uint){
		return 0;
	}
	function isNeedsMoney()external view returns(bool){
		return _getDebtMultiplier()*neededWei > totalWeiReceived;
	}

	// -------------- IDestination

	function flushTo(address _to) external onlyOwner {
		emit WeiFund_FlushTo(_to, this.balance);
		_to.transfer(this.balance);
	}

	function flush() external onlyOwner {
		emit WeiFund_FlushTo(owner, this.balance);
		owner.transfer(this.balance);
	}	

	function() external{

	}
}



contract WeiFund is WeiRelativeExpense {
	address public output;		// will not be able to change that later!
	bool public allowFlushTo = true;

	event WeiFund_FlushTo(address _to, uint _balance);
	event WeiFund_Flush(address _to, uint _balance);

	constructor(address _output, bool _allowFlushTo, uint _percentsDiv100Needed) public 
		WeiRelativeExpense(_percentsDiv100Needed)
	{
		output = _output;
		allowFlushTo = _allowFlushTo;
	}

	// Process funds, send it to the Output
	function flushTo(address _to) external onlyOwner {
		require(allowFlushTo);		// this operation can be prohibited
		emit WeiFund_FlushTo(_to, address(this).balance);
		_to.transfer(address(this).balance);
	}

	// Process funds, send it to the Output
	function flush() external onlyOwner {
		require(0x0!=output);

		// TODO: check for vulnerabilities
		isMoneyReceived = false;
		emit WeiFund_FlushTo(output, address(this).balance);
		output.transfer(address(this).balance);
	}

	function isNeedsMoney()external view returns(bool){
		// fund always needs money!
		return true;
	}
}