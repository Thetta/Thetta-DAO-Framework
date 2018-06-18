pragma solidity ^0.4.21;

import "./moneyflow/IMoneyflow.sol";
import "../IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract MoneyflowCentral{
	address[] children;

	mapping (uint => uint[])  public moneyflowNodes;
	mapping (uint => address) public moneyflowOutputs;
	mapping (uint => uint)    public NodeTypes;
	mapping (uint => bool)    public NodeOpenStatus;
	// TYPES:
	// 0 – weiTopDownSplitter
	// 1 - weiUnsortedSplitter
	// 2 - weiExpense

	function setNewConnection(uint _Node, uint[] _connections) public{
		moneyflowNodes[_Node] = _connections;
	}

	function setNewOutput(uint _Node, address _output) public{
		moneyflowOutputs[_Node] = _output;
	}

	function setNodeType(uint _Node, uint _type) public{
		NodeTypes[_Node] = _type;
	}

	function setNodeOpenStatus(uint _Node, bool _status) public{
		NodeOpenStatus[_Node] = _status;
	}
}

// TODO: move some functions to moneyflow library
// TODO:  
/*contract MoneyflowCentral2 is DaoClient, Ownable{
	mapping (uint => MoneyflowNode) public moneyflowNodes;
	uint moneyflowNodesCount;

	enum NodeType{
		WeiTopDownSplitter,
		WeiUnsortedSplitter,
		WeiAbsoluteExpense,
		WeiRelativeExpense
	}

	struct MoneyflowNode{
		uint[] connections;
		NodeType nodeType;
		bool isOpen; // initialy, all elements set to false; if isOpen==false => element doesn`t exist
		address output;
		uint neededAmount; // 0-10000 percents*100 for relative and 0-infinity wei for absolute
	}

	function setMoneyflowNode(uint _moneyflowNodesCount, uint _Node, uint[] _connections, NodeType _type, bool _isOpen, address _output, uint _neededAmount) public{
		moneyflowNodes[_Node] = MoneyflowNode(_connections, _type, _isOpen, _output, _neededAmount);
		moneyflowNodesCount = _moneyflowNodesCount;
	}

	function processNodes() external payable{
		_processNode(moneyflowNodes[0]);
	}	

	function _processNode(MoneyflowNode node, uint _currentFlow) internal{
		amount = _currentFlow;
		if(!node.isOpen){
			return;
		}

		if(NodeType.WeiAbsoluteExpense==node.nodeType){
			node.output.transfer(node.neededAmount);
			node.isOpen=false; //TODO: change it; expense should not be one-off only
		
		}else if(NodeType.WeiRelativeExpense==node.nodeType){
			node.output.transfer(node.neededAmount * _amount / 10000);
		
		}else if(NodeType.WeiTopDownSplitter==node.nodeType){
			_processNode(node, amount);
			uint needed = _getTotalWeiNeeded(node, amount);
			total += needed; 
			if(amount>=needed){
				amount = amount - needed;
			}else{
				amount = 0;
			}
		
		}else if(NodeType.WeiUnsortedSplitter==node.nodeType){
			_processNode(node, amount);
		}	
	}

	function _getTotalWeiNeeded(MoneyflowNode node, uint _currentFlow)internal view returns(uint){
		amount = _currentFlow;
		if(!node.isOpen){
			return 0;
		}

		if(NodeType.WeiAbsoluteExpense==node.nodeType){
			total += node.neededAmount;
		
		}else if(NodeType.WeiRelativeExpense==node.nodeType){
			total += node.neededAmount*amount/10000;

		}else if(NodeType.WeiTopDownSplitter==node.nodeType){
			uint needed = _getTotalWeiNeeded(node, amount);
			total += needed; 
			if(amount>=needed){
				amount = amount - needed;
			}else{
				amount = 0;
			}
		
		}else if(NodeType.WeiUnsortedSplitter==node.nodeType){
			total += _getTotalWeiNeeded(node, amount); 
		}	
		return total;
	}

	function _getMinWeiNeeded(MoneyflowNode node)internal view returns(uint){
		if(!node.isOpen){
			return 0;
		}

		if(NodeType.WeiAbsoluteExpense==node.nodeType){
			total += node.neededAmount;
		
		}else if(NodeType.WeiRelativeExpense==node.nodeType){
			total += 0;

		}else if(NodeType.WeiTopDownSplitter==node.nodeType){
			uint needed = _getMinWeiNeeded(node, amount);
			total += needed; 
		
		}else if(NodeType.WeiUnsortedSplitter==node.nodeType){
			total += _getMinWeiNeeded(node, amount); 
		}	
		return total;
	}

}/*
