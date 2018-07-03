pragma solidity ^0.4.21;

import "./moneyflow/IMoneyflow.sol";
import "./IDaoBase.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// TODO: написать приемочные тесты для самых разных случаев, штук 20 хотя бы.
// TODO: добавить periodic, accumulateDebt (пока все затраты одноразовые кроме relative)

// TODO: move some functions to moneyflow library
// TODO:  MoneyflowSystem -> MoneyflowProcessor + MoneyflowStorage

contract MoneyflowBasis is Ownable{
	mapping (uint => Node) public nodes;
	uint[] public nodeIds;

	struct Node{
		uint[] outputNodeIds;
		uint[] outputParts;
		bool isPeriodic;
		bool isAccumulateDebt;
		bool isActive;
		uint periodHours;
		uint neededAmount;
		
		bool isAutoWithdraw;
		address output;
		bool isDynamic;
		bool isTokenType;

		uint dateFundsFullyReceived;
		uint balanceOnDateFundsFullyReceived;
		uint balance;
		bool isExist;	
	}

	event console(string op, uint param);
	event consoleBool(string op, bool param);

	function uintArraySum(uint[] arr) public pure returns(uint) {
		uint S;
		for(uint i; i<arr.length; i++){
			S += arr[i];
		}
		return S;
	}

	function setNode(uint _nodeId,
		uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
		bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
		uint _neededAmount,      bool _isAutoWithdraw, address _output, 
		bool _isDynamic,         bool _isTokenType) public onlyOwner {

		require(_outputNodeIds.length==_outputParts.length);
		require(_nodeId!=0);
		if(!nodes[_nodeId].isExist){
			nodeIds.push(_nodeId);
		}

		nodes[_nodeId] = Node(
			_outputNodeIds,     _outputParts,    _isPeriodic, 
			_isAccumulateDebt,  _isActive,       _periodHours, 
			_neededAmount,      _isAutoWithdraw, _output, 
			_isDynamic,         _isTokenType,
			0,                  0,               0,
			true);
	}

	function getNodeInfo1(uint _nodeId) public view returns(
			uint[] outputNodeIds,
			uint[] outputParts,
			bool isPeriodic,
			bool isAccumulateDebt,
			bool isActive,
			uint periodHours,
			uint neededAmount,
			bool isAutoWithdraw){
		outputNodeIds    = nodes[_nodeId].outputNodeIds;         
		outputParts      = nodes[_nodeId].outputParts;           
		isPeriodic       = nodes[_nodeId].isPeriodic;            
		isAccumulateDebt = nodes[_nodeId].isAccumulateDebt;      
		isActive         = nodes[_nodeId].isActive;              
		periodHours      = nodes[_nodeId].periodHours;           
		neededAmount     = nodes[_nodeId].neededAmount;          
		isAutoWithdraw   = nodes[_nodeId].isAutoWithdraw;        
	}

	function getNodeInfo2(uint _nodeId) public view returns(
			address output,
			bool isDynamic,
			bool isTokenType,
			uint dateFundsFullyReceived,
			bool isExist,
			uint balance){     
		output                 = nodes[_nodeId].output;                
		isDynamic              = nodes[_nodeId].isDynamic;             
		isTokenType            = nodes[_nodeId].isTokenType;           
		dateFundsFullyReceived = nodes[_nodeId].dateFundsFullyReceived;
		isExist                = nodes[_nodeId].isExist;       
		balance                = nodes[_nodeId].balance;                       
	}

	function _getDebtMultiplier(uint _nodeId)internal view returns(uint){
		if((nodes[_nodeId].isAccumulateDebt)&&(0!=nodes[_nodeId].dateFundsFullyReceived)){
			return ((uint64(now) - nodes[_nodeId].dateFundsFullyReceived) / (nodes[_nodeId].periodHours * 3600 * 1000));
		} else{
			return 1;
		}
	}

	function getSelfNeededAmount(uint _nodeId, uint _nodeFlow) public view returns(uint need) {
		// _value is only need for relative dynamic weiExpence
		// emit console('dateFundsFullyReceived_left', uint64(now)-nodes[_nodeId].dateFundsFullyReceived);
		// emit console('dateFundsFullyReceived_right', nodes[_nodeId].periodHours*3600*1000);
		// emit console('dateFundsFullyReceived', nodes[_nodeId].dateFundsFullyReceived);

		// emit console('getSelfNeededAmount balance', nodes[_nodeId].balance);
		// emit console('getSelfNeededAmount need', nodes[_nodeId].neededAmount);
		// emit console('getSelfNeededAmount now', now);

		if((nodes[_nodeId].isPeriodic) && (now-nodes[_nodeId].dateFundsFullyReceived<nodes[_nodeId].periodHours*3600*1000)){
			need = 0;
			// emit console('option', 1);

		}else if((nodes[_nodeId].isPeriodic) && (0==nodes[_nodeId].dateFundsFullyReceived)){
			need = nodes[_nodeId].neededAmount;			
			// emit console('option', 2);

		}else if(nodes[_nodeId].isDynamic){
			need = IWeiReceiver(nodes[_nodeId].output).getTotalWeiNeeded(_nodeFlow);
			// emit console('option', 3);

		}else if((0!=nodes[_nodeId].dateFundsFullyReceived)&&(!nodes[_nodeId].isPeriodic)){
			need = 0;
			// emit console('option', 4);

		}else if((nodes[_nodeId].neededAmount >= nodes[_nodeId].balance)&&(!nodes[_nodeId].isPeriodic)){
			need = nodes[_nodeId].neededAmount - nodes[_nodeId].balance;
			// emit console('option', 5);

		}else if((nodes[_nodeId].isPeriodic) && (now-nodes[_nodeId].dateFundsFullyReceived>nodes[_nodeId].periodHours*3600*1000) && (nodes[_nodeId].dateFundsFullyReceived!=0)){
	
			need = _getDebtMultiplier(_nodeId)*nodes[_nodeId].neededAmount + nodes[_nodeId].balanceOnDateFundsFullyReceived - nodes[_nodeId].balance;
			// emit console('option', 6);

			// emit console('_getDebtMultiplier', _getDebtMultiplier(_nodeId));
			// emit console('neededAmount', nodes[_nodeId].neededAmount);
			// emit console('balance', nodes[_nodeId].balance);
			// emit console('balanceOnDateFundsFullyReceived', nodes[_nodeId].balanceOnDateFundsFullyReceived);

		}else{
			need = 0;
			emit console('option', 7);
		}
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

	function flushAmountFromNodeTo(uint _nodeId, uint _amount, address _receiver) public onlyOwner {
		require(nodes[_nodeId].balance>=_amount);
		require(getSelfNeededAmount(_nodeId, 0)==0); // flush only from full nodes
		nodes[_nodeId].dateFundsFullyReceived = now;
		nodes[_nodeId].balance -= _amount;
		_receiver.transfer(_amount);
	}

	function flushNodeBalanceTo(uint _nodeId, address _receiver) public onlyOwner {
		flushAmountFromNodeTo(_nodeId, nodes[_nodeId].balance, _receiver);
	}

	function processExternalOutputs(uint _nodeId, uint _needed, uint _nodeFlow) public{
		// The basic behavior is: if there is no money, then we accumulate until we get the right amount.	
		if(nodes[_nodeId].isDynamic){
			IWeiReceiver(nodes[_nodeId].output).processFunds.value(_needed)(_nodeFlow);
		}else{
			nodes[_nodeId].output.transfer(_needed);
		}
		nodes[_nodeId].dateFundsFullyReceived = now;
		nodes[_nodeId].balanceOnDateFundsFullyReceived = nodes[_nodeId].balance;
		nodes[_nodeId].balance -= _needed;
	}

	function _sendAmountToNode(uint _nodeIdFrom, uint _nodeId, uint _value) public {
		require(nodes[_nodeId].isExist);

		emit console('----------------- NODE ID', _nodeId);

		if(0!=_nodeIdFrom){
			require(nodes[_nodeIdFrom].balance>=_value);
			emit console('@@@-----> nodes[_nodeIdFrom].balance', nodes[_nodeIdFrom].balance);
			emit console('@@@-----> _value', _value);
			nodes[_nodeIdFrom].balance -= _value;
		}	

		uint rest = 0;
		uint selfNeed = getSelfNeededAmount(_nodeId, _value);

		nodes[_nodeId].balance += _value;

		// emit console('selfNeed', selfNeed);
		// emit console('balance', nodes[_nodeId].balance);

		// self-sent node
		if(_nodeIdFrom==_nodeId){
			return;
		}

		if(_value>selfNeed){
			rest = _value - selfNeed;
			// require(nodes[_nodeId].outputNodeIds.length>0);
		}

		emit console('@@@@@@_value', _value);
		emit console('@@@@@@selfNeed', selfNeed);
		emit console('@@@@@@rest',rest);

		if(((!nodes[_nodeId].isDynamic)&&(0==nodes[_nodeId].dateFundsFullyReceived) && (_value>=selfNeed)) ||
		   ((!nodes[_nodeId].isDynamic)&&(_value>=selfNeed)&&(nodes[_nodeId].isPeriodic))){
			nodes[_nodeId].dateFundsFullyReceived = now;
			nodes[_nodeId].balanceOnDateFundsFullyReceived = nodes[_nodeId].balance;
		}

		if(
			(nodes[_nodeId].output!=0x0)&&
			(selfNeed<=nodes[_nodeId].balance)&&
			(0!=selfNeed)&&
			(nodes[_nodeId].isAutoWithdraw)){
				processExternalOutputs(_nodeId, selfNeed, _value);
		}

		emit console('rest', rest);

		if(rest>0){
			uint outputTotalSum = uintArraySum(nodes[_nodeId].outputParts);
			emit console('outputTotalSum', outputTotalSum);
			uint baseRest = rest;

			for(uint i=0; i<nodes[_nodeId].outputNodeIds.length; i++){
				emit console('############ Current node', i);
				_sendAmountToNode(
					_nodeId,
					nodes[_nodeId].outputNodeIds[i], 
					nodes[_nodeId].outputParts[i]*baseRest/outputTotalSum
				);

				emit console('rest was', rest);
				rest -= nodes[_nodeId].outputParts[i]*baseRest/outputTotalSum;
				emit console('rest becomes', rest);
			}

			emit console('rest after all', rest);
			emit console('----------------------------------------------', 0);

			if(rest>0){
				revert();
			}
		}
	}

	function getNodeBalance(uint _nodeId) public view returns(uint){
		return nodes[_nodeId].balance;
	}

	function sendAmountToMoneyflow() public payable{
		_sendAmountToNode(0, 1, msg.value);
	}

	function() public payable{
		// zero-node represents an outside world
		// first-node is an entry point
		_sendAmountToNode(0, 1, msg.value);
	}	
}



/*contract MoneyflowSystemBasis is Ownable{
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
		uint dateFundsFullyReceived;
		uint balance;
		
		bool autoWithdraw;
		address output;
		bytes32 params;
	}

	struct Output{
		uint nodeId;
		uint percent;
	}

	function createNode(
				bool _isPeriodic, 
				bool _isAccumulateDebt, 
				uint _periodHours, 
				uint _condensatedAmount,
				bool _autoWithdraw,
				address _output,
				bytes32 _params) public onlyOwner returns(uint){
		uint[] empty;
		uint nodeId = getNewNodeId();
		nodeIds.push(nodeId);
		nodes[nodeId] = Node(
			empty, 
			empty, 
			_isPeriodic, 
			_isAccumulateDebt, 
			true, 
			true, 
			_periodHours, 
			_condensatedAmount,
			0, 
			0,
			_autoWithdraw,
			_output,
			_params);
		return nodeId;
	}

	function setNodeOutputs(uint _nodeId, 
				uint[] _outputNodeIds,
				uint[] _outputProportions) public onlyOwner {
		require(_outputNodeIds.length==_outputProportions.length);
		Node node = nodes[_nodeId];
		nodes[_nodeId] = Node(
			_outputNodeIds, 
			_outputProportions, 
			node.isPeriodic, 
			node.isAccumulateDebt, 
			node.isActive, 
			true, 
			node.periodHours, 
			node.condensatedAmount, 
			node.dateFundsFullyReceived, 
			node.balance);
	}


	function setNode(uint _nodeId, 
				uint[] _outputNodeIds,
				uint[] _outputProportions,
				bool _isPeriodic, 
				bool _isAccumulateDebt, 
				bool _isActive, 
				uint _periodHours, 
				uint _condensatedAmount,
				bool _autoWithdraw,
				address _output,
				bytes32 _params) public onlyOwner {

		require(_outputNodeIds.length==_outputProportions.length);
		if(!nodes[_nodeId].isExist){
			nodeIds.push(_nodeId);
		}

		nodes[_nodeId] = Node(
			_outputNodeIds, 
			_outputProportions, 
			_isPeriodic, 
			_isAccumulateDebt, 
			_isActive, 
			true, 
			_periodHours, 
			_condensatedAmount, 
			0, 
			0,
			_autoWithdraw,
			_output,
			_params);
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

	function flushNodeBalanceTo(uint _nodeId, address _receiver) external onlyOwner {
		_receiver.transfer(nodes[_nodeId].balance);
	}

	function connectNewNodeToExistingOne(
			uint _connecctionTargetId, 
			uint[] _connecctionTargetNodeIds, 
			uint[] _conecctionTargetPercents,

			uint[] _outputNodeIds,
			uint[] _outputProportions,
			bool _isPeriodic, 
			bool _isAccumulateDebt,
			bool _isActive, 
			uint _periodHours, 
			uint _condensatedAmount) public onlyOwner returns(uint){
		
		require(_connecctionTargetNodeIds.length==_conecctionTargetPercents.length);
		require(_outputNodeIds.length==_outputProportions.length);

		uint nodeId = getNewNodeId();

		// FIRST: create new node
		setNode(
			nodeId,
			_outputNodeIds,
			_outputProportions,
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

	function _sendAmountToNode(uint _nodeIdFrom, uint _nodeId, uint _value) internal {
		uint value = _value;
		uint deficit = nodes[_nodeId].condensatedAmount - nodes[_nodeId].balance; //TODO: fix for periodic
	
		if(_nodeIdFrom==_nodeId){
			nodes[_nodeId].balance += value;
			return
		}

		if(_nodeIdFrom!=0){
			require(nodes[_nodeIdFrom].balance>=_value);
			nodes[_nodeIdFrom].balance -= _value;
		}

		// FIRST: send money to fill condensatedAmount
		if(deficit>0){
			if(value>=deficit){
				nodes[_nodeId].balance += deficit;
				value -= deficit;
				nodes[_nodeId].dateFundsFullyReceived = now;
			}else{
				nodes[_nodeId].balance += value;
				value = 0;
			}
		}

		// SECOND: send money to output
		uint selfFunds = value;
		uint outputTotalSum = 0;
		if(value>0){
			for(uint i=0; i<nodes[_nodeId].outputNodeIds.length; i++){
				outputTotalSum += nodes[_nodeId].outputPercents[i]*value;
			}
			for(uint i=0; i<nodes[_nodeId].outputNodeIds.length; i++){
				_sendAmountToNode(
					_nodeId,
					nodes[_nodeId].outputNodeIds[i], 
					nodes[_nodeId].outputPercents[i]*value/outputTotalSum);
				selfFunds -= nodes[_nodeId].outputPercents[i]*value/outputTotalSum;
			}

			if(selfFunds!=0){
				revert();
				//nodes[_nodeId].balance += selfFunds;
			}
		}
	}

	function() public payable{
		// zero-node represents an outside world
		// first-node is an entry point
		_sendAmountToNode(0, 1, msg.value);
	}

}

contract FlowSystem is Flow { // owned by FlowScheme
	function createLinearPeriodicNode(){}
	function createLinearOneOffNode(){}
	function createLinearRelativeNode(){}
	function createSplitter(){}
	function createFund(){}

	function modifyNode(){}
	function removeNode(){}

	function addNodeToTheEnd(){}
	function insertNodeBetween(){}
	function addNodeToSplitter(){}
	function swapNodes(){}
	function disconnectNode(){}

	function flushAmountFromNode(){}
}

contract FlowScheme {
	function flowCycle(){}

	function utilAdd(){}
	function utilModify(){}
	function utilRemove(){}

	function taskAdd(){}
	function taskModify(){}
	function taskRemove(){}

	function employeeAdd(){}
	function employeeModify(){}
	function employeeRemove(){}

	function dividendReceiverAdd(){}
	function dividendReceiverModify(){}
	function dividendReceiverRemove(){}

	function reserveToFlow(){}

	function bonusAdd(){}
	function bonusModify(){}
	function bonusRemove(){}
}*/

/*contract MoneyflowSystem is MoneyflowSystemBasis{
	function addSplitter(uint _connecctionTargetId, uint[] _connecctionTargetNodeIds, uint[] _conecctionTargetPercents, uint[] _outputNodeIds, uint[] _outputProportions) external returns(uint) {

		return connectNewNodeToExistingOne(
			_connecctionTargetId, _connecctionTargetNodeIds, _conecctionTargetPercents,
			_outputNodeIds, _outputProportions, false, false, true, 0, 0);
	}

	function addRelativeExpense(uint _connecctionTargetId, uint[] _connecctionTargetNodeIds, uint[] _conecctionTargetPercents, uint[] _outputNodeIds, uint[] _outputProportions) external returns(uint) {
		require(1==_outputNodeIds.length);
		require(100==uintArraySum(_outputProportions));
		// _outputNodeIds contains 

		return connectNewNodeToExistingOne(
			_connecctionTargetId, _connecctionTargetNodeIds, _conecctionTargetPercents,
			_outputNodeIds, _outputProportions, false, false, true, 0, 0);
	}

	function addAbsoluteExpense(uint _connecctionTargetId, uint[] _connecctionTargetNodeIds, uint[] _conecctionTargetPercents, uint[] _outputNodeIds, uint[] _outputProportions, uint condensatedAmount) external returns(uint) {
		require(1==_outputNodeIds.length);
		require(100==uintArraySum(_outputProportions));

		return connectNewNodeToExistingOne(
			_connecctionTargetId, _connecctionTargetNodeIds, _conecctionTargetPercents,
			_outputNodeIds, _outputProportions, false, false, true, 0, condensatedAmount);
	}
}*/


 //                                                          3 node
 //                                                          ----------------
 //      1 node                 2 node        SPLITTER HERE  |Reserve fund  |
 //      ----------------      ---------------- 80%          |              |
 //  $1  |materials $0.2| $0.8 |salaries  $3K | -––––––––––> |              |
 // 0--->|              | ––––>|••••••        | after fill   ---------------- 
 //      |              |      |••••••••••••••| -––––––––––> ----------------
 //      ----------------      ---------------- 20%          |production    |
 //                                                          |update        |
 //                                                   4 node |              |
 //                                                          ----------------


/*contract MoneyflowSchemeExample1 is MoneyflowSystem {  
	constructor(){
		addAbsoluteExpense(0, [1],   [100],   [2],   [100],   0.2); // periodic with period 0
		addAbsoluteExpense(1, [2],   [100],   [3,4], [80,20], 0); // periodic with period month
		addSplitter(       2, [3],   [100],   [4,5], [80,20]);
		addRelativeExpense(3, [4,5], [80,20], [4],   [100]);
		addRelativeExpense(3, [4,5], [80,20], [5],   [100]);
	}
} 

contract MoneyflowSchemeExample2 is MoneyflowSystem {
	constructor(){
		// bool _isPeriodic, 
		// bool _isAccumulateDebt, 
		// uint _periodHours, 
		// uint _condensatedAmount
		uint n1 = createNode(true, false, 0, 0.2);
		uint n2 = createNode(true, true, 24*30, 3000);
		uint n3 = createNode(false, false, 0, 0);
		uint n4 = createNode(false, false, 0, 0);

		setNodeOutputs(n1, [n2], [100]);
		setNodeOutputs(n2, [n3,n4], [80,20]);
		setNodeOutputs(n3, [n3], [100]); // It can be default behavior
		setNodeOutputs(n4, [n4], [100]);
	}
}

contract MoneyflowSchemeExample3 is MoneyflowSystem {
	constructor(){
		// bool _isPeriodic, 
		// bool _isAccumulateDebt, 
		// uint _periodHours, 
		// uint _condensatedAmount
		uint n1 = createNode(true, false, 0, 0.2);
		uint n2 = createNode(true, true, 24*30, 3000);
		uint n3 = createFund(); // self output 100% and no periodic params
		uint n4 = createFund(); // self output 100% and no periodic params

		setNodeOutputs(n1, [n2], [100]);
		setNodeOutputs(n2, [n3,n4], [80,20]);
	}
}

contract MoneyflowSchemeExample4 is MoneyflowSystem {
	constructor(){
		uint n1 = createLinearNode(0, true, false, 0, 0.2); // first arg – uint from
		uint n2 = createLinearNode(n1, true, true, 24*30, 3000); // first arg – uint from
		uint n3 = createFund(); // self output 100% and no periodic params
		uint n4 = createFund(); // self output 100% and no periodic params
		uint s1 = createSplitter(n2, [n3,n4], [80,20]); // uint from, uint[] to, uint[] percents
	}
}

contract MoneyflowSchemeExample5 is MoneyflowSystem {
	constructor(){
		uint n1 = createLinearNode(0, true, false, 0, 0.2); // first arg – uint from
		uint n2 = createLinearNode(n1, true, true, 24*30, 3000); // first arg – uint from
		uint s1 = createSplitter(n2); // uint from, uint[] to, uint[] percents
		uint n3 = createFund(s1, 80); // self output 100% and no periodic params
		uint n4 = createFund(s1, 20); // self output 100% and no periodic params
	}
}


//      1 node                 2 node                 node
//      ----------------      ----------------      ---------------- 
//      |100 ETH       |      |500 ETH       | 100% |bonuses       | 
// 0--->|1 milestone   |-––––>|2 milestone   |-––––>|              |
//      |              |      |              |      |              |
//      ----------------      ----------------      ---------------- 


contract MoneyflowSchemeExample6 is MoneyflowSystem {
	constructor(){
		uint n1 = createLinearNode(0, false, false, 0, 100);
		uint n2 = createLinearNode(n1, false, false, 0, 500);
		uint n3 = createLinearFund(n2);
	}
}

contract MoneyflowSchemeExample7 is MoneyflowSystem {
	constructor(){
		uint n1 = createLinearOneOffNode(0, 100);
		uint n2 = createLinearOneOffNode(n1, 500);
		uint n3 = createLinearFund(n2);
	}
}


//         1 node              2 node                3 node                4 node          
//        ----------------    ----------------      ----------------      ---------------- 
//        |10%           |    |100 ETH       |      |500 ETH       | 100% |bonuses       | 
// 0-––––>|fed. tax      |--->|1 milestone   |-––––>|2 milestone   |-––––>|              |
//        |              |    |              |      |              |      |              |
//        ----------------    ----------------      ----------------      ---------------- 


// Relative node can not be periodic, because it have no sense
contract MoneyflowSchemeExample8 is MoneyflowSystem {
	constructor(){
		uint n1 = createLinearRelativeNode(0, 10);
		uint n2 = createLinearOneOffNode(n1, 100);
		uint n3 = createLinearOneOffNode(n2, 500);
		uint n4 = createLinearFund(n3);
	}
}



//         1 node              2 node                3 node                4 node          
//        ----------------    ----------------      ----------------      ---------------- 
//        |0.6ETH        |    |3.3 ETH       |      |1.8 ETH       | 100% |4%            |
// 0-––––>|utils         |--->|Salaries      |-––––>|Tasks         |-––––>|Bonuses       | 
//        |              |    |              |      |              |      |              |
//        ----------------    -------- --------      ----------------      ---------------- 
//         5 node         
//        ----------------
//        |75%           |
// --––––>|Reserve       |
//        |              |
//        ----------------
//         6 node         
//        ----------------
//        |25% ETH       |
// ------>|Dividends     |
//        |              |
//        ----------------



contract MoneyflowSystem {
	//function eachTransactionAccumulateNode(){} // calculateDebt = true, period = 0, periodic==true
	function createLinearPeriodicNode(){}
	function createLinearOneOffNode(){}
	function createLinearRelativeNode(){}
	function createSplitter(){}
	function createFund(){}
}

contract MoneyflowSchemeExample9 is MoneyflowSystem {
	constructor(){
		uint utils = createLinearPeriodicNode(0, false, 24*30, 0.6); //calculateDebt == false; period == 1 month
		uint salaries = createLinearPeriodicNode(utils, true, 24*7, 0.6); //calculateDebt == true; period == 1 week
		uint tasks = createLinearOneOffNode(salaries, 1.8); // non-periodic, but needed amount regulary grows (after adding new task)
		uint bonuses = createLinearRelativeNode(tasks, 4);
		uint splitter = createSplitter(bonuses);
		uint reserve = createFund(splitter, 75);
		uint dividends = createFund(splitter, 25);
	}

	enum Salaries {
		Grade1,
		Grade2,
		Grade3
	}

	function addNewTask(){
		// ...
		sendAmountToNode(tasks, task.cost);
	}

	function payForTask(){
		withdrawAmointFromNode(tasks, executor, task.cost);
	}

	function addEmployee(){

	}

	function setSalary(){}

	function paySalaries(){}

	function removeEmployee(){}

	function payForUtils(){}

	function payDividends(){}

	function getMoneyFromReserve(){
		// only for utils, salaries and tasks
	}
}

contract Flow {
	function _addNode(){}
	function _modifyNode(){}
	function _connectNode(){}
	function _removeNode(){}
	function _flushAmountFromNode(){}
	function _sendAmountToNode(){}
}

contract FlowSystem is Flow { // owned by FlowScheme
	function createLinearPeriodicNode(){}
	function createLinearOneOffNode(){}
	function createLinearRelativeNode(){}
	function createSplitter(){}
	function createFund(){}

	function modifyNode(){}
	function removeNode(){}

	function addNodeToTheEnd(){}
	function insertNodeBetween(){}
	function addNodeToSplitter(){}
	function swapNodes(){}
	function disconnectNode(){}

	function flushAmountFromNode(){}
}

contract FlowScheme {
	function flowCycle(){}

	function utilAdd(){}
	function utilModify(){}
	function utilRemove(){}

	function taskAdd(){}
	function taskModify(){}
	function taskRemove(){}

	function employeeAdd(){}
	function employeeModify(){}
	function employeeRemove(){}

	function dividendReceiverAdd(){}
	function dividendReceiverModify(){}
	function dividendReceiverRemove(){}

	function reserveToFlow(){}

	function bonusAdd(){}
	function bonusModify(){}
	function bonusRemove(){}
}*/

/*Moneyflow moneyflow = Moneyflow.new();

// трасмиттер умеет кидать только сюда 
interface MoneyflowOutput {
    // parameters нужны чтобы передать данные именно о каком таске идет речь
    function processFunds(bytes32 parameters);

    // если нужно - то можно и такой метод добавить в этот интерфейс
    // для однозначности. но это надо думать, в простом варианте - мы не берем у output'ов данные о том, сколько же им нужно
    // но в случае task'а - наверное это оправданно, так как данные о том, сколько ему же нужно хранятся в самом таске, 
    // а не в таблице Moneyflow
    function getAmountWeiNeeded(bytes32 parameters)constant returns(uint);
}

contract TaskTable is MoneyflowOutput {
    Task[] tasks; 

    function processFunds(bytes32 parameters){
        // реализуем этот метод. Находим у себя в таблице таск по индексу (индекс достаем из параметров)
    }
}

// Moneyflow 
contract Moneyflow {
      function addOutputToContract(MoneyflowOutput _output, bytes32 _parameter);
}*/

