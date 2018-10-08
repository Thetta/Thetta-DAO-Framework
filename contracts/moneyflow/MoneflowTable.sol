pragma solidity ^0.4.21;

import "./IMoneyflow.sol";

import "./ether/WeiExpense.sol";

import "../IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract MoneyflowTable is IWeiReceiver, Ownable {
	uint public nodesCount = 0;
	enum NodeTypes {
		AbsoluteExpense,
		RelativeExpense,
		TopdownSplitter,
		UnsortedSplitter
	}
	event NodeAdded(uint _eId, NodeTypes _eType);

	mapping(uint=>NodeTypes) nodesType;
	mapping(uint=>Expense) expenses;
	mapping(uint=>Splitter) splitters;

	struct Expense {
		uint neededAmount;
		uint neededPpm;
		
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

	// -------------------- INTERNAL IWEIRECEIVER FUNCTIONS -------------------- for nodes

	function _getPartsPerMillion(uint _eId) internal view returns(uint) {
		if(NodeTypes.RelativeExpense == nodesType[_eId]) {
			return expenses[_eId].neededPpm;
		}else {
			return 0;
		}
	}

	function isNodeNeedsMoney(uint _id)view external returns(bool) {
		return _isNeedsMoney(_id);
	}		

	function _isNeedsMoney(uint _eId) internal view returns(bool) {
		if(splitters[_eId].isOpen) {
			return _isNeedsMoneySplitter(_eId);
		}else if(expenses[_eId].isOpen) {
			return _isNeedsMoneyExpense(_eId);
		}else {
			return false;
		}
	}

	function _isNeedsMoneySplitter(uint _eId) internal view returns(bool) {
		for(uint i=0; i<splitters[_eId].outputs.length; ++i) { // if at least 1 child needs money -> return true
			if(_isNeedsMoney(splitters[_eId].outputs[i])) {
				return true;
			}
		}
		return false;
	}

	function _isNeedsMoneyExpense(uint _eId) internal view returns(bool) {
		if(expenses[_eId].isPeriodic) { // For period Weiexpense
			if ((uint64(block.timestamp) - expenses[_eId].momentReceived) >= expenses[_eId].periodHours * 3600 * 1000) { 
				return true;
			}
		}else {
			return !expenses[_eId].isMoneyReceived;
		}
	}

	function _processFunds(uint _eId, uint _currentFlow, uint _amount) internal {
		if(splitters[_eId].isOpen) {
			return _processFundsSplitter(_eId, _currentFlow, _amount);
		}else if(expenses[_eId].isOpen && _isNeedsMoney(_eId)) {
			return _processFundsExpense(_eId, _currentFlow, _amount);
		}else {}
	}

	function _processFundsSplitter(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_amount>=_getTotalWeiNeeded(_eId, _currentFlow));
		uint currentFlow = _currentFlow;

		for(uint i=0; i<splitters[_eId].outputs.length; ++i) {
			uint needed = _getTotalWeiNeeded(splitters[_eId].outputs[i], currentFlow);
			_processFunds(splitters[_eId].outputs[i], currentFlow, needed);
		
			if(NodeTypes.TopdownSplitter == nodesType[_eId]) {
				if(currentFlow >= needed) {
					currentFlow = currentFlow - needed;
				}else {
					currentFlow = 0;
				}
			}
		}
	}

	function _processFundsExpense(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_isNeedsMoney(_eId));
		require(_amount == _getTotalWeiNeeded(_eId, _currentFlow));
		expenses[_eId].momentReceived = uint(block.timestamp);
		expenses[_eId].balance += _amount;
		expenses[_eId].isMoneyReceived = true;
	}
	
	function getMinWeiNeededForNode(uint _eId) external view returns(uint) {
		return _getMinWeiNeeded(_eId);
	}

	function _getMinWeiNeeded(uint _eId) internal view returns(uint) {
		if((splitters[_eId].isOpen) && (NodeTypes.TopdownSplitter == nodesType[_eId])) {
			return _getMinWeiNeededTopdownSplitter(_eId);
	
		}else if((splitters[_eId].isOpen) && (NodeTypes.UnsortedSplitter == nodesType[_eId])) {
			return _getMinWeiNeededUnsortedSplitter(_eId);

		}else if(expenses[_eId].isOpen && _isNeedsMoney(_eId)) {
			return _getMinWeiNeededExpense(_eId);

		}else {
			return 0;
		}
	}

	function _getMinWeiNeededUnsortedSplitter(uint _eId) internal view returns(uint) {
		uint absSum = 0;
		uint partsPerMillionReverseSum = 1000000;

		for(uint i=0; i<splitters[_eId].outputs.length; ++i) {
			if(NodeTypes.RelativeExpense == nodesType[splitters[_eId].outputs[i]]) {
				partsPerMillionReverseSum -= expenses[splitters[_eId].outputs[i]].neededPpm;
			}else {
				absSum += _getMinWeiNeeded(splitters[_eId].outputs[i]);
			}
		}

		if(partsPerMillionReverseSum==0) {
			return 0;
		}else {
			return 1000000*absSum/partsPerMillionReverseSum;
		}
	}

	function _getMinWeiNeededTopdownSplitter(uint _eId) internal view returns(uint) {
		uint out = 0;
		for(uint j=splitters[_eId].outputs.length;  j>0; --j) {
			if(NodeTypes.RelativeExpense == nodesType[splitters[_eId].outputs[j-1]]) {
				out = 1000000 * out / expenses[splitters[_eId].outputs[j-1]].neededPpm;
			}else {
				out += _getMinWeiNeeded(splitters[_eId].outputs[j-1]);
			}
		}
		return out;
	}

	function _getMinWeiNeededExpense(uint _eId) internal view returns(uint) {
		if(!_isNeedsMoney(_eId) || (NodeTypes.RelativeExpense == nodesType[_eId])) {
			return 0;
		}
		return _getDebtMultiplier(_eId)*expenses[_eId].neededAmount;
	}

	function _getDebtMultiplier(uint _eId) internal view returns(uint) {
		if((expenses[_eId].isAccumulateDebt)&&(0 != expenses[_eId].momentReceived)) {
			return ((block.timestamp - expenses[_eId].momentReceived) / (expenses[_eId].periodHours * 3600 * 1000));
		} else {
			return 1;
		}
	}

	function getTotalWeiNeededForNode(uint _eId, uint _currentFlow) external view returns(uint) {
		return _getTotalWeiNeeded(_eId, _currentFlow);
	}

	function _getTotalWeiNeeded(uint _eId, uint _currentFlow) internal view returns(uint) {
		if(splitters[_eId].isOpen) {
			return _getTotalWeiNeededSplitter(_eId, _currentFlow);
		}else if(expenses[_eId].isOpen) {
			return _getTotalWeiNeededExpense(_eId, _currentFlow);
		}else {
			return 0;
		}
	}

	function _getTotalWeiNeededSplitter(uint _eId, uint _currentFlow)internal view returns(uint) {
		uint currentFlow = _currentFlow;
		uint total = 0;
		for(uint i=0; i<splitters[_eId].outputs.length; ++i) {
			uint needed = _getTotalWeiNeeded(splitters[_eId].outputs[i], currentFlow);
			total = total + needed;

			if(NodeTypes.TopdownSplitter==nodesType[_eId]) { // this should be reduced because next child can get only '_inputWei minus what prev. child got'
				if(currentFlow>needed) {
					currentFlow-=needed;
				}else {
					currentFlow = 0;
				}
			}
		}
		return total;
	}

	function _getTotalWeiNeededExpense(uint _eId, uint _currentFlow)internal view returns(uint) {
		if(!_isNeedsMoney(_eId)) {
			return 0;
		}

		if(NodeTypes.RelativeExpense==nodesType[_eId]) {
			return (_getDebtMultiplier(_eId)*(expenses[_eId].neededPpm * _currentFlow)) / 1000000;
		}else {
			return _getMinWeiNeeded(_eId);
		}
	}

	function getNodeBalance(uint _eId)public view returns(uint) {
		return expenses[_eId].balance;
	}

	// -------------------- public IWEIRECEIVER FUNCTIONS -------------------- for all table

	function isNeedsMoney()view public returns(bool) {
		return _isNeedsMoney(0);
	}

	function getPartsPerMillion() public view returns(uint) {
		return _getPartsPerMillion(0);
	}

	function processFunds(uint _currentFlow) public payable {
		require(_currentFlow>=_getMinWeiNeeded(0));
		require(msg.value>=_getMinWeiNeeded(0));


		return _processFunds(0, _currentFlow, msg.value);
	}

	function getMinWeiNeeded()public view returns(uint) {
		return _getMinWeiNeeded(0);
	}

	function getTotalWeiNeeded(uint _currentFlow)public view returns(uint) {
		return _getTotalWeiNeeded(0, _currentFlow);
	}

	// -------------------- public SCHEME FUNCTIONS -------------------- 

	function addAbsoluteExpense(uint _neededAmount, bool _isPeriodic, bool _isAccumulateDebt, uint _periodHours, IWeiReceiver _output)public onlyOwner returns(uint) {
		expenses[nodesCount] = Expense(
			_neededAmount, 0,
			_periodHours, _isPeriodic, _isAccumulateDebt, _output,
			0, false, true, 0
		);
		nodesType[nodesCount] = NodeTypes.AbsoluteExpense;
		emit NodeAdded(nodesCount, NodeTypes.AbsoluteExpense);
		nodesCount += 1;
		return nodesCount-1;
	}

	function addRelativeExpense(uint _neededPpm, bool _isPeriodic, bool _isAccumulateDebt, uint _periodHours, IWeiReceiver _output)public onlyOwner returns(uint) {
		expenses[nodesCount] = Expense(
			0, _neededPpm,
			_periodHours, _isPeriodic, _isAccumulateDebt, _output,
			0, false, true, 0
		);	
		nodesType[nodesCount] = NodeTypes.RelativeExpense;
		emit NodeAdded(nodesCount, NodeTypes.RelativeExpense);
		nodesCount += 1;	
		return nodesCount-1;
	}

	function addTopdownSplitter()public onlyOwner returns(uint) {
		uint[] memory emptyOutputs;
		splitters[nodesCount] = Splitter(true, emptyOutputs);
		nodesType[nodesCount] = NodeTypes.TopdownSplitter;	
		emit NodeAdded(nodesCount, NodeTypes.TopdownSplitter);
		nodesCount += 1;
		return nodesCount-1;
	}

	function addUnsortedSplitter()public onlyOwner returns(uint) {
		uint[] memory emptyOutputs;
		splitters[nodesCount] = Splitter(true, emptyOutputs);
		nodesType[nodesCount] = NodeTypes.UnsortedSplitter;
		emit NodeAdded(nodesCount, NodeTypes.UnsortedSplitter);
		nodesCount += 1;
		return nodesCount-1;
	}

	function addChild(uint _splitterId, uint _childId)public onlyOwner returns(uint) {
		// add require`s
		splitters[_splitterId].outputs.push(_childId);
	}

	// -------------------- public CONTROL FUNCTIONS -------------------- 
	

	function _isExpense(uint _eId) internal returns(bool) {
		if((NodeTypes.AbsoluteExpense==nodesType[_eId])||
		   (NodeTypes.RelativeExpense==nodesType[_eId])) {
			return true;
		}else {
			return false;
		}
	}

	function _isSplitter(uint _eId) internal returns(bool) {
		if((NodeTypes.UnsortedSplitter==nodesType[_eId])||
		   (NodeTypes.TopdownSplitter==nodesType[_eId])) {
			return true;
		}else {
			return false;
		}
	}

	function openNode(uint _eId) public onlyOwner {
		if(_isExpense(_eId)) {
			expenses[_eId].isOpen = true;

		}else if(_isSplitter(_eId)) {
			splitters[_eId].isOpen = true;

		}else {
			revert();
		}
	}

	function closeNode(uint _eId)public onlyOwner {
		if(_isExpense(_eId)) {
			expenses[_eId].isOpen = false;

		}else if(_isSplitter(_eId)) {
			splitters[_eId].isOpen = false;

		}else {
			revert();
		}	
	}

	function isOpen(uint _eId) public view returns(bool) {
		if(_isExpense(_eId)) {
			return expenses[_eId].isOpen;

		}else if(_isSplitter(_eId)) {
			return splitters[_eId].isOpen;

		}else {
			revert();
		}

	}

	function getChildrenCount(uint _eId)public view returns(uint) {
		require(_isSplitter(_eId));
		return splitters[_eId].outputs.length;
	}

	function getChildId(uint _eId, uint _index)public view returns(uint) {
		require(_isSplitter(_eId));
		require(splitters[_eId].outputs.length>_index);
		return splitters[_eId].outputs[_index];
	}

	function flushFromNode(uint _eId)public onlyOwner {
		expenses[_eId].output.processFunds.value(expenses[_eId].balance)(expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function() public {
	}
}
