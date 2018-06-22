pragma solidity ^0.4.21;

import "./moneyflow/IMoneyflow.sol";
import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// TODO: move some functions to moneyflow library
// TODO:  MoneyflowSystem -> MoneyflowProcessor + MoneyflowStorage

contract MoneyflowSystemBasis is Ownable{
	mapping (uint => Node) public nodes;
	uint[] public nodeIds;
	
	struct Node{
		uint[] outputNodeIds;
		uint[] outputPercents;
		bool isPeriodic;
		bool isAccumulateDebt;
		bool isActive;
		bool isExist;

		uint periodHours;
		uint condensatedAmount;
		uint dateBalanceReceived;
		uint balance;
	}

	struct Output{
		uint nodeId;
		uint percent;
	}

	function setNode(uint _nodeId, 
				uint[] _outputNodeIds,
				uint[] _outputPercents,
				bool _isPeriodic, 
				bool _isAccumulateDebt, 
				bool _isActive, 
				uint _periodHours, 
				uint _condensatedAmount) public onlyOwner {

		require(_outputNodeIds.length==_outputPercents.length);
		if(!nodes[_nodeId].isExist){
			nodeIds.push(_nodeId);
		}

		nodes[_nodeId] = Node(_outputNodeIds, _outputPercents, _isPeriodic, _isAccumulateDebt, _isActive, true, _periodHours, _condensatedAmount, 0, 0);
	}

	function getNewNodeId() public view returns(uint){
		uint out = nodeIds[nodeIds.length-1];
		bool founded = false;
		while(founded==false){
			if(nodes[out].isExist==false){
				founded = true;
			}else{
				out += 1;
			}
		}
		return out;
	}

	function uintArraySum(uint[] arr) public pure returns(uint) {
		uint S;
		for(uint i; i<arr.length; i++){
			S += arr[i];
		}
		return S;
	}

	// function getNode(uint _nodeId)public view returns(Node) {
	// 	return nodes[_nodeId];
	// }

	function flushNodeBalanceTo(uint _nodeId, address _receiver) external onlyOwner {
		_receiver.transfer(nodes[_nodeId].balance);
	}

	function connectNewNodeToExistingOne(
			uint _connecctionTargetId, 
			uint[] _connecctionTargetNodeIds, 
			uint[] _conecctionTargetPercents,

			uint[] _outputNodeIds,
			uint[] _outputPercents,
			bool _isPeriodic, 
			bool _isAccumulateDebt,
			bool _isActive, 
			uint _periodHours, 
			uint _condensatedAmount) public onlyOwner returns(uint){
		
		require(_connecctionTargetNodeIds.length==_conecctionTargetPercents.length);
		require(_outputNodeIds.length==_outputPercents.length);

		uint nodeId = getNewNodeId();

		// FIRST: create new node
		setNode(
			nodeId,
			_outputNodeIds,
			_outputPercents,
			_isPeriodic,
			_isAccumulateDebt,
			_isActive,
			_periodHours,
			_condensatedAmount
		);
		// SECOND: connect node to moneyFlow node
		Node connecctionTargetNode = nodes[_connecctionTargetId];
		setNode(
			_connecctionTargetId,
			_connecctionTargetNodeIds,
			_conecctionTargetPercents,

			connecctionTargetNode.isPeriodic,
			connecctionTargetNode.isAccumulateDebt,
			connecctionTargetNode.isActive,
			connecctionTargetNode.periodHours,
			connecctionTargetNode.condensatedAmount);

		return nodeId;
	}	

	function _sendAmountToNode(uint _nodeId, uint _value) internal {
		uint value = _value;
		uint deficit = nodes[_nodeId].condensatedAmount - nodes[_nodeId].balance; //TODO: fix for periodic
		
		// FIRST: send money to fill condensatedAmount
		if(deficit>0){
			if(value>=deficit){
				nodes[_nodeId].balance += deficit;
				value -= deficit;
				nodes[_nodeId].dateBalanceReceived = now;
			}else{
				nodes[_nodeId].balance += value;
				value = 0;
			}
		}

		// SECOND: send money to output
		uint selfFunds = value;
		if(value>0){
			for(uint i=0; i<nodes[_nodeId].outputNodeIds.length; i++){
				_sendAmountToNode(nodes[_nodeId].outputNodeIds[i], nodes[_nodeId].outputPercents[i]*value/100);
				selfFunds -= nodes[_nodeId].outputPercents[i]*value/100;
			}

			if(selfFunds>0){
				nodes[_nodeId].balance += selfFunds;
			}
		}
	}

	function() public payable{
		_sendAmountToNode(0, msg.value);
	}

}

contract MoneyflowSystem is MoneyflowSystemBasis{
	function addSplitter(uint _connecctionTargetId, uint[] _connecctionTargetNodeIds, uint[] _conecctionTargetPercents, uint[] _outputNodeIds, uint[] _outputPercents) external returns(uint) {

		return connectNewNodeToExistingOne(
			_connecctionTargetId, _connecctionTargetNodeIds, _conecctionTargetPercents,
			_outputNodeIds, _outputPercents, false, false, false, 0, 0);
	}

	function addRelativeExpense(uint _connecctionTargetId, uint[] _connecctionTargetNodeIds, uint[] _conecctionTargetPercents, uint[] _outputNodeIds, uint[] _outputPercents) external returns(uint) {
		require(1==_outputNodeIds.length);
		require(10000>uintArraySum(_outputPercents));

		return connectNewNodeToExistingOne(
			_connecctionTargetId, _connecctionTargetNodeIds, _conecctionTargetPercents,
			_outputNodeIds, _outputPercents, false, false, false, 0, 0);
	}

	function addAbsoluteExpense(uint _connecctionTargetId, uint[] _connecctionTargetNodeIds, uint[] _conecctionTargetPercents, uint[] _outputNodeIds, uint[] _outputPercents, uint condensatedAmount) external returns(uint) {
		require(1==_outputNodeIds.length);
		require(10000==uintArraySum(_outputPercents));

		return connectNewNodeToExistingOne(
			_connecctionTargetId, _connecctionTargetNodeIds, _conecctionTargetPercents,
			_outputNodeIds, _outputPercents, false, false, false, 0, condensatedAmount);
	}
}