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
	bool isAccumulateDebt = false;
	bool isPeriodic = false;
	uint percentsMul100 = 0;
	uint periodHours = 0;
	uint momentReceived = 0;
	uint neededWei = 0;
	address moneySource = 0x0;

	bytes32 constant public START_TASK = keccak256("startTask");
	bytes32 constant public START_BOUNTY = keccak256("startBounty");

	event WeiExpense_Flush(address _owner, uint _balance);
	event WeiExpense_SetNeededWei(uint _neededWei);
	event WeiExpense_SetPercents(uint _percentsMul100);
	event WeiWxpense_ProcessFunds(address _sender, uint _value, uint _currentFlow);

	/**
	* @dev Constructor
	* @param _neededWei - absolute value. how much Ether this expense should receive (in Wei). Can be zero (use _percentsMul100 in this case)
	* @param _percentsMul100 - if need to get % out of the input flow -> specify this parameter (1% is 100 units)
	* @param _periodHours - if not isPeriodic and periodHours>0 ->no sense. if isPeriodic and periodHours==0 -> needs money everytime. if isPeriodic and periodHours>0 -> needs money every period.
	* @param _isAccumulateDebt - if you don't pay in the current period -> will accumulate the needed amount (only for _neededWei!)
	* @param _isPeriodic - if isPeriodic and periodHours>0 -> needs money every period. if isPeriodic and periodHours==0 -> needs money everytime.
	*/
	constructor(uint _neededWei, uint _percentsMul100, uint _periodHours, bool _isAccumulateDebt, bool _isPeriodic) public {
		percentsMul100 = _percentsMul100;
		periodHours = _periodHours;
		neededWei = _neededWei;
		isAccumulateDebt = _isAccumulateDebt;
		isPeriodic = _isPeriodic;
	}

	function processFunds(uint _currentFlow) external payable{
		emit WeiWxpense_ProcessFunds(msg.sender, msg.value, _currentFlow);
		_processFunds(_currentFlow);
	}

	function _processFunds(uint _currentFlow) internal{
		require(_isNeedsMoney());

		require(msg.value == _getTotalWeiNeeded(_currentFlow));

		// TODO: why not working without if????
		if(isPeriodic){ 
			momentReceived = uint(now);
		}

		isMoneyReceived = true;
		moneySource = msg.sender;
	}

	function getIsMoneyReceived() external view returns(bool){
		return isMoneyReceived;
	}

	function getNeededWei() external view returns(uint){
		return neededWei;
	}

	function getTotalWeiNeeded(uint _inputWei)external view returns(uint){
		return _getTotalWeiNeeded(_inputWei);
	}

	function _getTotalWeiNeeded(uint _inputWei)internal view returns(uint){
		if(!_isNeedsMoney()){
			return 0;
		}

		if(0!=percentsMul100){
			return (_getDebtMultiplier()*(percentsMul100 * _inputWei)) / 10000;
		}else{
			return _getMinWeiNeeded();
		}
	}

	function getMinWeiNeeded()external view returns(uint){
		return _getMinWeiNeeded();
	}

	function _getMinWeiNeeded()internal view returns(uint){
		if(!_isNeedsMoney() || (0!=percentsMul100)){
			return 0;
		}
		return _getDebtMultiplier()*neededWei;
	}

	function getMomentReceived()external view returns(uint){
		return momentReceived;
	}

	function getDebtMultiplier()external view returns(uint){
		return _getDebtMultiplier();
	}

	function _getDebtMultiplier()internal view returns(uint){
		if((isAccumulateDebt)&&(0!=momentReceived)){
			return ((now - momentReceived) / (periodHours * 3600 * 1000));
		} else{
			return 1;
		}
	}

	function isNeedsMoney()external view returns(bool){
		return _isNeedsMoney();
	}

	function _isNeedsMoney()internal view returns(bool){
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

	function getPercentsMul100()external view returns(uint){
		return percentsMul100;
	}

	// TODO: remove from here
	function getNow()external view returns(uint){
		return now;
	}

	function flush()external onlyOwner{
		emit WeiExpense_Flush(owner, address(this).balance);
		owner.transfer(address(this).balance);
	}

	function flushTo(address _to) external onlyOwner {
		if(_to==_to) revert();
	}

	function setNeededWei(uint _neededWei) external onlyOwner {
		emit WeiExpense_SetNeededWei(_neededWei);
		neededWei = _neededWei;
	}

	function setPercents(uint _percentsMul100) external onlyOwner {
		emit WeiExpense_SetPercents(_percentsMul100);
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
	constructor(uint _neededWei, uint _periodHours, bool _isAccumulateDebt) public
		WeiExpense(_neededWei, 0, _periodHours, _isAccumulateDebt, true)
	{}
}

contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint _percentsMul100, uint _periodHours, bool _isAccumulateDebt) public 
		WeiExpense(0, _percentsMul100, _periodHours, _isAccumulateDebt, true)
	{}
}
