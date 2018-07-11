pragma solidity ^0.4.15;

import "../IMoneyflow.sol";

import "./WeiExpense.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title WeiFund 
 * @dev WeiFund stores funds until 'flush' is called (pull model)
 * This is a terminal item, that has no children.
*/
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

/*contract ConditionalFund is WeiExpense {
	address output;  // will not be able to change that later!
	address nextTargetOutput;
	bool public allowFlushTo = true;
	bool isAutoWithdraw;
	bool isPeriodic;
	
	uint periodHours;
	uint neededAmount;

	uint momentReceived;
	uint balanceOnMomentReceived;

	event WeiFund_FlushTo(address _to, uint _balance);
	event WeiFund_Flush(address _to, uint _balance);

	constructor(uint _neededAmount, address _output, bool _isAutoWithdraw, address _nextTargetOutput, bool _allowFlushTo,  bool _isPeriodic, uint _periodHours) public 
		WeiExpense(_neededAmount, 0, _periodHours, false, _isPeriodic)
	{
		output = _output;
		allowFlushTo = _allowFlushTo;
		isAutoWithdraw = _isAutoWithdraw;
		nextTargetOutput = _nextTargetOutput;
		isPeriodic = _isPeriodic;
		periodHours = _periodHours;
		neededAmount = _neededAmount;
	}

	// Process funds, send it to the Output
	function flushTo(address _to) external onlyOwner {
		require(allowFlushTo);		// this operation can be prohibited
		emit WeiFund_FlushTo(_to, address(this).balance);
		_to.transfer(address(this).balance);
	}

	// Process funds, send it to the Output
	function flush() external onlyOwner {
		// TODO: check for vulnerabilities
		// isMoneyReceived = false;
		emit WeiFund_FlushTo(output, address(this).balance);
		output.transfer(address(this).balance);
	}	

	function getTotalWeiNeeded()external view returns(uint){
		return _getTotalWeiNeeded(this.balance);
	}

	function _getTotalWeiNeeded(uint balance)internal view returns(uint){
		uint need = 0;

		if((isPeriodic) && (now-momentReceived<periodHours*3600*1000)){
			need = 0;

		}else if((isPeriodic) && (0==momentReceived)){
			need = neededAmount;			

		}else if((0!=momentReceived)&&(!isPeriodic)){
			need = 0;

		}else if((neededAmount >= balance)&&(!isPeriodic)){
			need = neededAmount - balance;

		}else if((isPeriodic) && (now-momentReceived>periodHours*3600*1000) && (momentReceived!=0)){
			need = _getDebtMultiplier()*neededAmount + balanceOnMomentReceived - balance;

		}else{
			need = 0;
		}

		return need;
	}

	function _processFunds(uint _currentFlow) internal{
		uint rest = 0;
		uint selfNeed = _getTotalWeiNeeded(this.balance - _currentFlow);

		if(_currentFlow>selfNeed){
			rest = _currentFlow - selfNeed;
		}

		if(((0==momentReceived) && (_currentFlow>=selfNeed)) ||
		   ((_currentFlow>=selfNeed)&&(isPeriodic))){
			momentReceived = now;
			balanceOnMomentReceived = this.balance;
		}

		if((rest>0)||(_getTotalWeiNeeded(this.balance)==0)){
			if(isAutoWithdraw){
				output.transfer(this.balance);
			}else{
				IWeiReceiver(nextTargetOutput).processFunds.value(rest)(rest);
			}
		}
	}

	function _getMinWeiNeeded()internal view returns(uint){
		return 0;
	}

	function isNeedsMoney()external view returns(bool){ // fund always needs money!
		return true;
	}
}*/