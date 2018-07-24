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

contract WeiFund is IWeiReceiver, IDestination, Ownable {//
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

	function getTotalFundNeededAmount()public view returns(uint){
		return neededWei;
	}

	function getDebtMultiplier()public view returns(uint){
		if((isPeriodic)&&(!isAccumulateDebt)&&( (now - momentReceived) / (periodHours * 3600 * 1000) >=1)){
			return (balanceOnMomentReceived/neededWei) + 1;
		} else if((isPeriodic)&&(isAccumulateDebt)){
			return 1 + ((now - momentCreated) / (periodHours * 3600 * 1000));
		}else{
			return 1;
		}
	}

	// -------------- IWeiReceiver

	function processFunds(uint _currentFlow) public payable{
		// emit consoleUint('_getDebtMultiplier', _getDebtMultiplier());
		require(isNeedsMoney());

		require(totalWeiReceived+msg.value<=getDebtMultiplier()*neededWei); // protect from extra money
		// require(msg.value==_currentFlow);
		totalWeiReceived += msg.value;
		if(getTotalWeiNeeded(msg.value)==0){
			momentReceived = now;
			balanceOnMomentReceived = totalWeiReceived;
		}	
	}

	function getTotalWeiNeeded(uint _inputWei)public view returns(uint){
		uint need;
		if(getDebtMultiplier()*neededWei > totalWeiReceived){
			need = getDebtMultiplier()*neededWei - totalWeiReceived;	
		}else{
			need = 0;
		}

		if(need<=_inputWei){
			return need;
		}else{
			return _inputWei;
		}
	}

	function getMinWeiNeeded()public view returns(uint){
		return 0;
	}

	function getPercentsMul100() view public returns(uint){
		return 0;
	}

	function isNeedsMoney()public view returns(bool){
		return getDebtMultiplier()*neededWei > totalWeiReceived;
	}

	// -------------- IDestination

	function flushTo(address _to) public onlyOwner {
		emit WeiFund_FlushTo(_to, this.balance);
		_to.transfer(this.balance);
	}

	function flush() public onlyOwner {
		emit WeiFund_FlushTo(owner, this.balance);
		owner.transfer(this.balance);
	}	

	function() public{

	}
}
