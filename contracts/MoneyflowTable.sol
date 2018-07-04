pragma solidity ^0.4.21;

import "./moneyflow/IMoneyflow.sol";
import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract MoneyflowTable is IWeiReceiver, Ownable{

	enum ElementTypes {
		AbsoluteExpense,
		RelativeExpense,

		TopdownSplitter,
		UnsortedSplitter
	}

	mapping(uint=>ElementTypes) elementsType;
	mapping(uint=>Expense) Expenses;
	mapping(uint=>Splitter) Splitters;


	struct Expense {
		bool isExist;
		uint neededAmount;
		uint neededPercentsMul100;
		
		uint periodHours;

		bool isPeriodic;
		bool isAccumulateDebt;

		IWeiReceiver output;
		uint momentReceived;
		bool isMoneyReceived;
		bool isOpen;

		uint balance;
	}

	struct Splitter {
		bool isOpen;
		uint[] outputs;
	}

	// -------------------- INTERNAL IWEIRECEIVER FUNCTIONS -------------------- for elements

	function _getPercentsMul100(uint _eId)constant internal returns(uint) {
		if(ElementTypes.RelativeExpense == elementsType[_eId]){
			return Expenses[_eId].neededPercentsMul100;
		}else{
			return 0;
		}
	}

	function _isNeedsMoney(uint _eId)constant internal returns(bool) {
		if(Splitters[_eId].isOpen){
			return _isNeedsMoneySplitter(_eId);
		}else if(Expenses[_eId].isOpen){
			return _isNeedsMoneyExpense(_eId);
		}else {
			return false;
		}
	}

	function _isNeedsMoneySplitter(uint _eId)constant internal returns(bool) {
		for(uint i=0; i<Splitters[_eId].outputs.length; ++i){ // if at least 1 child needs money -> return true
			if(_isNeedsMoney(Splitters[_eId].outputs[i])){
				return true;
			}
		}
		return false;
	}

	function _isNeedsMoneyExpense(uint _eId)constant internal returns(bool) {
		if(Expenses[_eId].isPeriodic){ // For period Weiexpense
			if ((uint64(now) - Expenses[_eId].momentReceived) >= Expenses[_eId].periodHours * 3600 * 1000){ 
				return true;
			}
		}else{
			return !Expenses[_eId].isMoneyReceived;
		}
	}

	function _processFunds(uint _eId, uint _currentFlow, uint _amount) internal {
		if(Splitters[_eId].isOpen){
			return _processFundsSplitter(_eId, _currentFlow, _amount);
		}else if(Expenses[_eId].isOpen){
			return _processFundsExpense(_eId, _currentFlow, _amount);
		}else {
			revert();
		}
	}

	function _processFundsSplitter(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_amount>=_getTotalWeiNeeded(_eId, _currentFlow));

		for(uint i=0; i<Splitters[_eId].outputs.length; ++i){
			uint needed = _getTotalWeiNeeded(Splitters[_eId].outputs[i], _currentFlow);
			_processFunds(Splitters[_eId].outputs[i], _currentFlow, needed);
		
			if(ElementTypes.TopdownSplitter==elementsType[_eId]){
	 			if(_amount>=needed){
					_amount = _amount - needed;
				}else{
					_amount = 0;
				}
			}
		}
	}

	function _processFundsExpense(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_isNeedsMoney(_eId));
		require(_amount==_getTotalWeiNeeded(_eId, _currentFlow));
		Expenses[_eId].momentReceived = uint(now);
		Expenses[_eId].balance = _amount;
	}

	function _getMinWeiNeeded(uint _eId)internal view returns(uint) {
		if(Splitters[_eId].isOpen){
			return _getMinWeiNeededSplitter(_eId);
		}else if(Expenses[_eId].isOpen){
			return _getMinWeiNeededExpense(_eId);
		}else {
			return 0;
		}
	}

	function _getMinWeiNeededSplitter(uint _eId)internal view returns(uint) {
		uint total = 0;
		for(uint i=0; i<Splitters[_eId].outputs.length; ++i){
			uint needed = _getMinWeiNeeded(Splitters[_eId].outputs[i]);
			total = total + needed;
		}
		return total;
	}

	function _getMinWeiNeededExpense(uint _eId)internal view returns(uint) {
		if(!_isNeedsMoney(_eId)||(ElementTypes.RelativeExpense==elementsType[_eId])){
			return 0;
		}
		return _getDebtMultiplier(_eId)*Expenses[_eId].neededAmount;
	}

	function _getDebtMultiplier(uint _eId)internal view returns(uint){
		if((Expenses[_eId].isAccumulateDebt)&&(0!=Expenses[_eId].momentReceived)){
			return ((now - Expenses[_eId].momentReceived) / (Expenses[_eId].periodHours * 3600 * 1000));
		} else{
			return 1;
		}
	}

	function _getTotalWeiNeeded(uint _eId, uint _currentFlow)internal view returns(uint) {
		if(Splitters[_eId].isOpen){
			return _getTotalWeiNeededSplitter(_eId, _currentFlow);
		}else if(Expenses[_eId].isOpen){
			return _getTotalWeiNeededExpense(_eId, _currentFlow);
		}else {
			return 0;
		}
	}

	function _getTotalWeiNeededSplitter(uint _eId, uint _currentFlow)internal view returns(uint){
		uint total = 0;
		for(uint i=0; i<Splitters[_eId].outputs.length; ++i){
			uint needed = _getTotalWeiNeeded(Splitters[_eId].outputs[i], _currentFlow);
			total = total + needed;

			if(ElementTypes.TopdownSplitter==elementsType[_eId]){ // this should be reduced because next child can get only '_inputWei minus what prev. child got'
				if(_currentFlow>needed){
					_currentFlow-=needed;
				}else{
					_currentFlow = 0;
				}
			}
		}
		return total;
	}

	function _getTotalWeiNeededExpense(uint _eId, uint _currentFlow)internal view returns(uint) {
		if(!_isNeedsMoney(_eId)){
			return 0;
		}

		if(ElementTypes.RelativeExpense==elementsType[_eId]){
			return (_getDebtMultiplier(_eId)*(Expenses[_eId].neededPercentsMul100 * _currentFlow)) / 10000;
		}else{
			return _getMinWeiNeeded(_eId);
		}
	}


	// -------------------- EXTERNAL IWEIRECEIVER FUNCTIONS -------------------- for all table

	function isNeedsMoney()constant external returns(bool) {
		return _isNeedsMoney(0);
	}

	function processFunds(uint _currentFlow) external payable {
		return _processFunds(0, _currentFlow, msg.value);
	}

	function getMinWeiNeeded()external view returns(uint) {
		return _getMinWeiNeeded(0);
	}

	function getTotalWeiNeeded(uint _currentFlow)external view returns(uint) {
		return _getMinWeiNeeded(0);
	}

	// -------------------- EXTERNAL SCHEME FUNCTIONS -------------------- 
	/*
	function addRelativeExpense()external returns(uint){}
	function addRelativeExpense()external returns(uint){}

	function addTopdownSplitter()external returns(uint){}
	function addUnsortedSplitter()external returns(uint){}


	// -------------------- EXTERNAL CONTROL FUNCTIONS -------------------- 
	
	function openElement()external {}
	function closeElement()external {}

	function withdrawFundsFromElement(uint _eId)external {}*/


	function() external {
	}

}