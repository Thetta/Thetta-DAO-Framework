pragma solidity ^0.4.15;

import "../IDestination.sol";
import "../IWeiReceiver.sol";

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
	uint ppm = 0;
	uint periodHours = 0;
	uint momentReceived = 0;
	uint neededWei = 0;
	address moneySource = 0x0;

	event WeiExpenseFlush(address _owner, uint _balance);
	event WeiExpenseSetNeededWei(uint _neededWei);
	event WeiExpenseSetPercents(uint _ppm);
	event WeiExpenseProcessFunds(address _sender, uint _value, uint _currentFlow);

	/**
	* @dev Constructor
	* @param _neededWei - absolute value. how much Ether this expense should receive (in Wei). Can be zero (use _ppm in this case)
	* @param _ppm - if need to get % out of the input flow -> specify this parameter (1% is 10000 units)
	* @param _periodHours - if not isPeriodic and periodHours>0 ->no sense. if isPeriodic and periodHours==0 -> needs money everytime. if isPeriodic and periodHours>0 -> needs money every period.
	* @param _isAccumulateDebt - if you don't pay in the current period -> will accumulate the needed amount (only for _neededWei!)
	* @param _isPeriodic - if isPeriodic and periodHours>0 -> needs money every period. if isPeriodic and periodHours==0 -> needs money everytime.
	*/
	constructor(uint _neededWei, uint _ppm, uint _periodHours, bool _isAccumulateDebt, bool _isPeriodic) public {
		ppm = _ppm;
		periodHours = _periodHours;
		neededWei = _neededWei;
		isAccumulateDebt = _isAccumulateDebt;
		isPeriodic = _isPeriodic;
	}

	function processFunds(uint _currentFlow) public payable {
		emit WeiExpenseProcessFunds(msg.sender, msg.value, _currentFlow);
		require(isNeedsMoney());

		require(msg.value == getTotalWeiNeeded(_currentFlow));

		// TODO: why not working without if????
		if(isPeriodic) { 
			momentReceived = uint(block.timestamp);
		}

		isMoneyReceived = true;
		moneySource = msg.sender;
	}

	function getIsMoneyReceived() public view returns(bool) {
		return isMoneyReceived;
	}

	function getNeededWei() public view returns(uint) {
		return neededWei;
	}

	function getTotalWeiNeeded(uint _inputWei)public view returns(uint) {
		if(!isNeedsMoney()) {
			return 0;
		}

		if(0!=ppm) {
			return (getDebtMultiplier()*(ppm * _inputWei)) / 1000000;
		}else {
			return getMinWeiNeeded();
		}
	}

	function getMinWeiNeeded()public view returns(uint) {
		if(!isNeedsMoney() || (0!=ppm)) {
			return 0;
		}
		return getDebtMultiplier()*neededWei;
	}

	function getMomentReceived()public view returns(uint) {
		return momentReceived;
	}

	function getDebtMultiplier()public view returns(uint) {
		if((isAccumulateDebt)&&(0!=momentReceived)) {
			return ((block.timestamp - momentReceived) / (periodHours * 3600 * 1000));
		} else {
			return 1;
		}
	}

	function isNeedsMoney()public view returns(bool) {
		if(isPeriodic) { // For period Weiexpense
			if ((uint64(block.timestamp) - momentReceived) >= periodHours * 3600 * 1000) { 
				return true;
			}
		}else {
			return !isMoneyReceived;
		}
	}

	modifier onlyByMoneySource() { 
		require(msg.sender==moneySource); 
		_; 
	}

	function getPpm()public view returns(uint) {
		return ppm;
	}

	function flush()public onlyOwner {
		emit WeiExpenseFlush(owner, address(this).balance);
		owner.transfer(address(this).balance);
	}

	function flushTo(address _to) public onlyOwner {
		emit WeiExpenseFlush(_to, address(this).balance);
		_to.transfer(address(this).balance);
	}

	function setNeededWei(uint _neededWei) public onlyOwner {
		emit WeiExpenseSetNeededWei(_neededWei);
		neededWei = _neededWei;
	}

	function setPercents(uint _ppm) public onlyOwner {
		emit WeiExpenseSetPercents(_ppm);
		ppm = _ppm;
	}

	function()public {
	}
}