pragma solidity ^0.4.21;

import "./moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract MoneyflowCentral{
	address[] children;

	mapping (uint => uint[])  public moneyflowConnections;
	mapping (uint => address) public moneyflowOutputs;
	mapping (uint => uint)    public pointTypes;
	mapping (uint => bool)    public pointOpenStatus;
	// TYPES:
	// 0 – weiTopDownSplitter
	// 1 - weiUnsortedSplitter
	// 2 - weiExpense

	function setNewConnection(uint _point, uint[] _connections) public{
		moneyflowConnections[_point] = _connections;
	}

	function setNewOutput(uint _point, address _output) public{
		moneyflowOutputs[_point] = _output;
	}

	function setPointType(uint _point, uint _type) public{
		pointTypes[_point] = _type;
	}

	function setPointOpenStatus(uint _point, bool _status) public{
		pointOpenStatus[_point] = _status;
	}
}


contract MoneyflowCentral2{
	mapping (uint => MoneyflowPoint) public moneyflowConnections;

	enum PointType{
		WeiTopDownSplitter,
		WeiUnsortedSplitter,
		WeiExpense
	}

	struct MoneyflowPoint{
		uint[] connections;
		PointType pointType;
		bool isOpen;
		address output;
	}

	function setMoneyflowPoint(uint _point, uint[] _connections, PointType _type, bool _isOpen, address _output) public{
		moneyflowConnections[_point] = MoneyflowPoint(_connections, _type, _isOpen, _output);
	}
}