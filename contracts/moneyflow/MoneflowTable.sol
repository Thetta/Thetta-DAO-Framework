pragma solidity ^0.4.21;

import "./IMoneyflow.sol";

import "./ether/WeiExpense.sol";

import "../IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract MoneyflowTable is Ownable{//is IWeiReceiver,
	uint public elementsCount = 0;
	enum ElementTypes {
		AbsoluteExpense,
		RelativeExpense,
		TopdownSplitter,
		UnsortedSplitter
	}
	event ElementAdded(uint _eId, ElementTypes _eType);

	mapping(uint=>ElementTypes) elementsType;
	mapping(uint=>Expense) Expenses;
	mapping(uint=>Splitter) Splitters;

	struct Expense {
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
		}else if(Expenses[_eId].isOpen&&_isNeedsMoney(_eId)){
			return _processFundsExpense(_eId, _currentFlow, _amount);
		}else {
		}
	}

	function _processFundsSplitter(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_amount>=_getTotalWeiNeeded(_eId, _currentFlow));

		for(uint i=0; i<Splitters[_eId].outputs.length; ++i){
			uint needed = _getTotalWeiNeeded(Splitters[_eId].outputs[i], _currentFlow);
			_processFunds(Splitters[_eId].outputs[i], _currentFlow, needed);
		
			if(ElementTypes.TopdownSplitter==elementsType[_eId]){
	 			if(_currentFlow>=needed){
					_currentFlow = _currentFlow - needed;
				}else{
					_currentFlow = 0;
				}
			}
		}
	}

	function _processFundsExpense(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_isNeedsMoney(_eId));
		require(_amount==_getTotalWeiNeeded(_eId, _currentFlow));
		Expenses[_eId].momentReceived = uint(now);
		Expenses[_eId].balance += _amount;
		Expenses[_eId].isMoneyReceived = true;
	}
	
	function getMinWeiNeededForElement(uint _eId)external view returns(uint) {
		return _getMinWeiNeeded(_eId);
	}

	function _getMinWeiNeeded(uint _eId)internal view returns(uint) {
		if((Splitters[_eId].isOpen)&&(ElementTypes.TopdownSplitter==elementsType[_eId])){
			return _getMinWeiNeededTopdownSplitter(_eId);
	
		}else if((Splitters[_eId].isOpen)&&(ElementTypes.UnsortedSplitter==elementsType[_eId])){
			return _getMinWeiNeededUnsortedSplitter(_eId);

		}else if(Expenses[_eId].isOpen && _isNeedsMoney(_eId)){
			return _getMinWeiNeededExpense(_eId);

		}else {
			return 0;
		}
	}

	function _getMinWeiNeededUnsortedSplitter(uint _eId) internal view returns(uint) {
		uint absSum = 0;
		uint percentsMul100ReverseSum = 10000;

		for(uint i=0; i<Splitters[_eId].outputs.length; ++i){
			if(ElementTypes.RelativeExpense==elementsType[Splitters[_eId].outputs[i]]){
				percentsMul100ReverseSum -= Expenses[Splitters[_eId].outputs[i]].neededPercentsMul100;
			}else{
				absSum += _getMinWeiNeeded(Splitters[_eId].outputs[i]);
			}
		}

		if(percentsMul100ReverseSum==0){
			return 0;
		}else{
			return 10000*absSum/percentsMul100ReverseSum;
		}
	}

	function _getMinWeiNeededTopdownSplitter(uint _eId)internal view returns(uint) {
		uint out = 0;
		for(uint j=Splitters[_eId].outputs.length;  j>0; --j){
			if(ElementTypes.RelativeExpense==elementsType[Splitters[_eId].outputs[j-1]]){
				out = 10000 * out / Expenses[Splitters[_eId].outputs[j-1]].neededPercentsMul100;
			}else{
				out += _getMinWeiNeeded(Splitters[_eId].outputs[j-1]);
			}
		}
		return out;
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

	function getTotalWeiNeededForElement(uint _eId, uint _currentFlow)external view returns(uint) {
		return _getTotalWeiNeeded(_eId, _currentFlow);
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

	function getElementBalance(uint _eId)external view returns(uint) {
		return Expenses[_eId].balance;
	}


	// -------------------- EXTERNAL IWEIRECEIVER FUNCTIONS -------------------- for all table

	function isNeedsMoney()constant external returns(bool) {
		return _isNeedsMoney(0);
	}

	function processFunds(uint _currentFlow) external payable {
		require(_currentFlow>=_getMinWeiNeeded(0));
		require(msg.value>=_getMinWeiNeeded(0));

		return _processFunds(0, _currentFlow, msg.value);
	}

	function getMinWeiNeeded()external view returns(uint) {
		return _getMinWeiNeeded(0);
	}

	function getTotalWeiNeeded(uint _currentFlow)external view returns(uint) {
		return _getTotalWeiNeeded(0, _currentFlow);
	}

	// -------------------- EXTERNAL SCHEME FUNCTIONS -------------------- 

	function addAbsoluteExpense(uint _neededAmount, bool _isPeriodic, bool _isAccumulateDebt, uint _periodHours, IWeiReceiver _output)external onlyOwner{
		Expenses[elementsCount] = Expense(
			_neededAmount, 0,
			_periodHours, _isPeriodic, _isAccumulateDebt, _output,
			0, false, true, 0
		);
		elementsType[elementsCount] = ElementTypes.AbsoluteExpense;
		emit ElementAdded(elementsCount, ElementTypes.AbsoluteExpense);
		elementsCount += 1;
	}

	function addRelativeExpense(uint _neededPercentsMul100, bool _isPeriodic, bool _isAccumulateDebt, uint _periodHours, IWeiReceiver _output)external onlyOwner{		
		Expenses[elementsCount] = Expense(
			0, _neededPercentsMul100,
			_periodHours, _isPeriodic, _isAccumulateDebt, _output,
			0, false, true, 0
		);	
		elementsType[elementsCount] = ElementTypes.RelativeExpense;
		emit ElementAdded(elementsCount, ElementTypes.RelativeExpense);
		elementsCount += 1;	
	}

	function addTopdownSplitter()external onlyOwner{
		uint[] memory emptyOutputs;
		Splitters[elementsCount] = Splitter(true, emptyOutputs);
		elementsType[elementsCount] = ElementTypes.TopdownSplitter;	
		emit ElementAdded(elementsCount, ElementTypes.TopdownSplitter);
		elementsCount += 1;
	}

	function addUnsortedSplitter()external onlyOwner{
		uint[] memory emptyOutputs;
		Splitters[elementsCount] = Splitter(true, emptyOutputs);
		elementsType[elementsCount] = ElementTypes.UnsortedSplitter;
		emit ElementAdded(elementsCount, ElementTypes.UnsortedSplitter);
		elementsCount += 1;
	}

	function addChild(uint _splitterId, uint _childId)external onlyOwner{
		// add require`s
		Splitters[_splitterId].outputs.push(_childId);
	}

	// -------------------- EXTERNAL CONTROL FUNCTIONS -------------------- 
	

	function _isExpense(uint _eId) internal returns(bool){
		if((ElementTypes.AbsoluteExpense==elementsType[_eId])||
		   (ElementTypes.RelativeExpense==elementsType[_eId])){
			return true;
		}else{
			return false;
		}
	}

	function _isSplitter(uint _eId) internal returns(bool){
		if((ElementTypes.UnsortedSplitter==elementsType[_eId])||
		   (ElementTypes.TopdownSplitter==elementsType[_eId])){
			return true;
		}else{
			return false;
		}
	}

	function openElement(uint _eId) external onlyOwner{
		if(_isExpense(_eId)){
			Expenses[_eId].isOpen = true;

		}else if(_isSplitter(_eId)){
			Splitters[_eId].isOpen = true;

		}else{
			revert();
		}
	}

	function closeElement(uint _eId)external onlyOwner{
		if(_isExpense(_eId)){
			Expenses[_eId].isOpen = false;

		}else if(_isSplitter(_eId)){
			Splitters[_eId].isOpen = false;

		}else{
			revert();
		}	
	}

	function isOpen(uint _eId) external view returns(bool){
		if(_isExpense(_eId)){
			return Expenses[_eId].isOpen;

		}else if(_isSplitter(_eId)){
			return Splitters[_eId].isOpen;

		}else{
			revert();
		}

	}

	function getChildrenCount(uint _eId)external view returns(uint){
		require(_isSplitter(_eId));
		return Splitters[_eId].outputs.length;
	}

	function getChildId(uint _eId, uint _index)external view returns(uint){
		require(_isSplitter(_eId));
		require(Splitters[_eId].outputs.length>_index);
		return Splitters[_eId].outputs[_index];
	}

	function withdrawFundsFromElement(uint _eId)external onlyOwner{
		// require(_isExpense(_eId));
		Expenses[_eId].output.processFunds.value(Expenses[_eId].balance)(Expenses[_eId].balance);
		Expenses[_eId].balance = 0;
	}

	function() external {
	}
}