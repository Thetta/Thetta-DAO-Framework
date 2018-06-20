pragma solidity ^0.4.21;

import "./moneyflow/IMoneyflow.sol";
import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// TODO: move some functions to moneyflow library
// TODO:  MoneyflowSystem -> MoneyflowProcessor + MoneyflowStorage

contract MoneyflowSystem is Ownable{
	mapping (uint => Node) nodes;
	
	struct Node{
		uint[] outputNodeIds;
		uint[] outputPercents;
		bool isPeriodic;
		bool isAccumulateDebt;
		bool isActive;

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
				uint _condensatedAmount) external onlyOwner {

		require(_outputNodeIds.length==_outputPercents.length);

		nodes[_nodeId] = Node(_outputNodeIds, _outputPercents, _isPeriodic, _isAccumulateDebt, _isActive, _periodHours, _condensatedAmount, 0, 0);
	}

	function flushNodeBalanceTo(uint _nodeId, address _receiver) external onlyOwner {
		_receiver.transfer(nodes[_nodeId].balance);
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
 