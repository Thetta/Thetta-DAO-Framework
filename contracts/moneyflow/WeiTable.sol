pragma solidity ^0.4.24;

import "./IWeiReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is IWeiReceiver, Ownable {
	uint public nodesCount = 0;
	enum NodeTypes {
		AbsoluteExpense,
		RelativeExpense,
		TopdownSplitter,
		UnsortedSplitter
	}
	event NodeAdded(uint _eId, NodeTypes _eType);
	event NodeConnected(uint _splitterId, uint _childId);
	event NodeFlushTo(uint _eId, address _to, uint _balance);

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
	function getPartsPerMillionAt(uint _eId) public view returns(uint) {
		if(NodeTypes.RelativeExpense == nodesType[_eId]) {
			return expenses[_eId].neededPpm;
		}else {
			return 0;
		}
	}

	function isNeedsMoneyAt(uint _eId) public view returns(bool) {
		if(splitters[_eId].isOpen) {
			return isNeedsMoneySplitterAt(_eId);
		}else if(expenses[_eId].isOpen) {
			return isNeedsMoneyExpenseAt(_eId);
		}else {
			return false;
		}
	}

	function isNeedsMoneySplitterAt(uint _eId) internal view returns(bool) {
		for(uint i=0; i<splitters[_eId].outputs.length; ++i) { // if at least 1 child needs money -> return true
			if(isNeedsMoneyAt(splitters[_eId].outputs[i])) {
				return true;
			}
		}
		return false;
	}

	function isNeedsMoneyExpenseAt(uint _eId) internal view returns(bool) {
		if(expenses[_eId].isPeriodic) { // For period Weiexpense
			if ((uint64(block.timestamp) - expenses[_eId].momentReceived) >= expenses[_eId].periodHours * 3600 * 1000) { 
				return true;
			}
		}else {
			return !expenses[_eId].isMoneyReceived;
		}
	}

	function processFundsAt(uint _eId, uint _currentFlow, uint _amount) internal {
		if(splitters[_eId].isOpen) {
			return processFundsSplitterAt(_eId, _currentFlow, _amount);
		}else if(expenses[_eId].isOpen && isNeedsMoneyAt(_eId)) {
			return processFundsExpenseAt(_eId, _currentFlow, _amount);
		}else {}
	}

	function processFundsSplitterAt(uint _eId, uint _currentFlow, uint _amount) internal {
		require(_amount>=getTotalWeiNeededAt(_eId, _currentFlow));
		uint currentFlow = _currentFlow;

		for(uint i=0; i<splitters[_eId].outputs.length; ++i) {
			uint needed = getTotalWeiNeededAt(splitters[_eId].outputs[i], currentFlow);
			processFundsAt(splitters[_eId].outputs[i], currentFlow, needed);
		
			if(NodeTypes.TopdownSplitter == nodesType[_eId]) {
				if(currentFlow >= needed) {
					currentFlow = currentFlow - needed;
				}else {
					currentFlow = 0;
				}
			}
		}
	}

	function processFundsExpenseAt(uint _eId, uint _currentFlow, uint _amount) internal {
		require(isNeedsMoneyAt(_eId));
		require(_amount == getTotalWeiNeededAt(_eId, _currentFlow));
		expenses[_eId].momentReceived = uint(block.timestamp);
		expenses[_eId].balance += _amount;
		expenses[_eId].isMoneyReceived = true;
	}

	function getMinWeiNeededAt(uint _eId) public view returns(uint) {
		if((splitters[_eId].isOpen) && (NodeTypes.TopdownSplitter == nodesType[_eId])) {
			return getMinWeiNeededTopdownSplitterAt(_eId);
		}else if((splitters[_eId].isOpen) && (NodeTypes.UnsortedSplitter == nodesType[_eId])) {
			return getMinWeiNeededUnsortedSplitterAt(_eId);
		}else if(expenses[_eId].isOpen && isNeedsMoneyAt(_eId)) {
			return getMinWeiNeededExpenseAt(_eId);
		}else {
			return 0;
		}
	}

	function getMinWeiNeededUnsortedSplitterAt(uint _eId) internal view returns(uint) {
		uint absSum = 0;
		uint partsPerMillionReverseSum = 1000000;

		for(uint i=0; i<splitters[_eId].outputs.length; ++i) {
			if(NodeTypes.RelativeExpense == nodesType[splitters[_eId].outputs[i]]) {
				partsPerMillionReverseSum -= expenses[splitters[_eId].outputs[i]].neededPpm;
			}else {
				absSum += getMinWeiNeededAt(splitters[_eId].outputs[i]);
			}
		}

		if(partsPerMillionReverseSum==0) {
			return 0;
		}else {
			return 1000000*absSum/partsPerMillionReverseSum;
		}
	}

	function getMinWeiNeededTopdownSplitterAt(uint _eId) internal view returns(uint) {
		uint out = 0;
		for(uint j=splitters[_eId].outputs.length;  j>0; --j) {
			if(NodeTypes.RelativeExpense == nodesType[splitters[_eId].outputs[j-1]]) {
				out = 1000000 * out / expenses[splitters[_eId].outputs[j-1]].neededPpm;
			}else {
				out += getMinWeiNeededAt(splitters[_eId].outputs[j-1]);
			}
		}
		return out;
	}

	function getMinWeiNeededExpenseAt(uint _eId) internal view returns(uint) {
		if(!isNeedsMoneyAt(_eId) || (NodeTypes.RelativeExpense == nodesType[_eId])) {
			return 0;
		}
		return getDebtMultiplierAt(_eId)*expenses[_eId].neededAmount;
	}

	function getDebtMultiplierAt(uint _eId) internal view returns(uint) {
		if((expenses[_eId].isAccumulateDebt)&&(0 != expenses[_eId].momentReceived)) {
			return ((block.timestamp - expenses[_eId].momentReceived) / (expenses[_eId].periodHours * 3600 * 1000));
		} else {
			return 1;
		}
	}

	function getTotalWeiNeededAt(uint _eId, uint _currentFlow) public view returns(uint) {
		if(splitters[_eId].isOpen) {
			return getTotalWeiNeededSplitterAt(_eId, _currentFlow);
		}else if(expenses[_eId].isOpen) {
			return getTotalWeiNeededExpenseAt(_eId, _currentFlow);
		}else {
			return 0;
		}
	}

	function getTotalWeiNeededSplitterAt(uint _eId, uint _currentFlow)internal view returns(uint) {
		uint currentFlow = _currentFlow;
		uint total = 0;
		for(uint i=0; i<splitters[_eId].outputs.length; ++i) {
			uint needed = getTotalWeiNeededAt(splitters[_eId].outputs[i], currentFlow);
			total = total + needed;

			// this should be reduced because next child can get only '_inputWei minus what prev. child got'
			if(NodeTypes.TopdownSplitter==nodesType[_eId]) {
				if(currentFlow>needed) {
					currentFlow-=needed;
				}else {
					currentFlow = 0;
				}
			}
		}
		return total;
	}

	function getTotalWeiNeededExpenseAt(uint _eId, uint _currentFlow)internal view returns(uint) {
		if(!isNeedsMoneyAt(_eId)) {
			return 0;
		}

		if(NodeTypes.RelativeExpense==nodesType[_eId]) {
			return (getDebtMultiplierAt(_eId)*(expenses[_eId].neededPpm * _currentFlow)) / 1000000;
		}else {
			return getMinWeiNeededAt(_eId);
		}
	}

	function balanceAt(uint _eId)public view returns(uint) {
		return expenses[_eId].balance;
	}

	// -------------------- public IWEIRECEIVER FUNCTIONS -------------------- for all table
	function isNeedsMoney()view public returns(bool) {
		return isNeedsMoneyAt(0);
	}

	function getPartsPerMillion() public view returns(uint) {
		return getPartsPerMillionAt(0);
	}

	function processFunds(uint _currentFlow) public payable {
		require(_currentFlow>=getMinWeiNeededAt(0));
		require(msg.value>=getMinWeiNeededAt(0));
		return processFundsAt(0, _currentFlow, msg.value);
	}

	function getMinWeiNeeded()public view returns(uint) {
		return getMinWeiNeededAt(0);
	}

	function getTotalWeiNeeded(uint _currentFlow)public view returns(uint) {
		return getTotalWeiNeededAt(0, _currentFlow);
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

	function addChildAt(uint _splitterId, uint _childId)public onlyOwner returns(uint) {
		// add require`s
		emit NodeConnected(_splitterId, _childId);
		splitters[_splitterId].outputs.push(_childId);
	}

	// -------------------- public CONTROL FUNCTIONS -------------------- 
	function isExpenseAt(uint _eId) internal returns(bool) {
		if((NodeTypes.AbsoluteExpense==nodesType[_eId])||
		   (NodeTypes.RelativeExpense==nodesType[_eId])) {
			return true;
		}else {
			return false;
		}
	}

	function isSplitterAt(uint _eId) internal returns(bool) {
		if((NodeTypes.UnsortedSplitter==nodesType[_eId])||
		   (NodeTypes.TopdownSplitter==nodesType[_eId])) {
			return true;
		}else {
			return false;
		}
	}

	function openAt(uint _eId) public onlyOwner {
		if(isExpenseAt(_eId)) {
			expenses[_eId].isOpen = true;
		}else if(isSplitterAt(_eId)) {
			splitters[_eId].isOpen = true;
		}else {
			revert();
		}
	}

	function closeAt(uint _eId)public onlyOwner {
		if(isExpenseAt(_eId)) {
			expenses[_eId].isOpen = false;
		}else if(isSplitterAt(_eId)) {
			splitters[_eId].isOpen = false;
		}else {
			revert();
		}	
	}

	function isOpenAt(uint _eId) public view returns(bool) {
		if(isExpenseAt(_eId)) {
			return expenses[_eId].isOpen;
		}else if(isSplitterAt(_eId)) {
			return splitters[_eId].isOpen;
		}else {
			revert();
		}
	}

	function getChildrenCountAt(uint _eId)public view returns(uint) {
		require(isSplitterAt(_eId));
		return splitters[_eId].outputs.length;
	}

	function getChildIdAt(uint _eId, uint _index)public view returns(uint) {
		require(isSplitterAt(_eId));
		require(splitters[_eId].outputs.length > _index);
		return splitters[_eId].outputs[_index];
	}

	function flushAt(uint _eId)public onlyOwner {
		owner.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, owner, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function flushToAt(uint _eId, address _to)public onlyOwner {
		_to.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, _to, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}	

	function() public {
	}
}