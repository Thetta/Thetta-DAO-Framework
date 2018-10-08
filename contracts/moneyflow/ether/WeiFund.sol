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


contract WeiFund is IWeiReceiver, IDestination, Ownable {
	using SafeMath for uint;

	uint neededWei;
	uint totalWeiReceived;
	uint momentReceived;
	uint balanceOnMomentReceived;
	uint momentCreated;

	bool isPeriodic;
	bool isAccumulateDebt;
	uint periodHours;

	event WeiFundFlushTo(address _to, uint _balance);

	constructor(uint _neededWei, bool _isPeriodic, bool _isAccumulateDebt, uint _periodHours) public {
		require(!((_isAccumulateDebt)&&(_periodHours==0)));
		require(!(!(_isPeriodic)&&(_periodHours!=0)));
		require(!((_isAccumulateDebt)&&(!_isPeriodic)));
		require(!((_neededWei==0)&&(_isPeriodic)));
		neededWei = _neededWei;
		isPeriodic = _isPeriodic;
		isAccumulateDebt = _isAccumulateDebt;
		periodHours = _periodHours;
		momentCreated = block.timestamp;
	}

	function getTotalFundNeededAmount()public view returns(uint) {
		return neededWei;
	}

	function getDebtMultiplier()public view returns(uint) {
		if((isPeriodic)&&(!isAccumulateDebt)&&( (block.timestamp - momentReceived) / (periodHours * 3600 * 1000) >=1)) {
			return (balanceOnMomentReceived/neededWei) + 1;
		} else if((isPeriodic)&&(isAccumulateDebt)) {
			return 1 + ((block.timestamp - momentCreated) / (periodHours * 3600 * 1000));
		}else {
			return 1;
		}
	}

	// -------------- IWeiReceiver

	function processFunds(uint _currentFlow) public payable {
		// emit consoleUint('_getDebtMultiplier', _getDebtMultiplier());
		require(isNeedsMoney());
		
		if(neededWei!=0) {
			require(totalWeiReceived+msg.value<=getDebtMultiplier()*neededWei); // protect from extra money
		}

		totalWeiReceived += msg.value;
		if(getTotalWeiNeeded(msg.value)==0) {
			momentReceived = block.timestamp;
			balanceOnMomentReceived = totalWeiReceived;
		}	
	}

	function getTotalWeiNeeded(uint _inputWei)public view returns(uint) {
		uint need;

		if(neededWei==0) {
			return _inputWei;
		}

		if(getDebtMultiplier()*neededWei > totalWeiReceived) {
			need = getDebtMultiplier()*neededWei - totalWeiReceived;	
		}else {
			need = 0;
		}

		if(need<=_inputWei) {
			return need;
		}else {
			return _inputWei;
		}
	}

	function getMinWeiNeeded()public view returns(uint) {
		return 0;
	}

	function getPartsPerMillion() view public returns(uint) {
		return 0;
	}

	function isNeedsMoney()public view returns(bool) {
		if(neededWei==0) {
			return true;
		}

		return getDebtMultiplier()*neededWei > totalWeiReceived;
	}

	// -------------- IDestination

	function flushTo(address _to) public onlyOwner {
		emit WeiFundFlushTo(_to, this.balance);
		_to.transfer(this.balance);
	}

	function flush() public onlyOwner {
		emit WeiFundFlushTo(owner, this.balance);
		owner.transfer(this.balance);
	}	

	function() public {

	}
}
