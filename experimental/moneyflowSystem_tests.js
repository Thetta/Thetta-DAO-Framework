// var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
// var StdDaoToken = artifacts.require("./StdDaoToken");
// var DaoStorage = artifacts.require("./DaoStorage");
// var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");

// to check how upgrade works with IDaoBase clients
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var IProposal = artifacts.require("./IProposal");
// var DaoBaseTest = artifacts.require("./DaoBaseTest"); 
// var DaoBaseWithUnpackersTest = artifacts.require("./DaoBaseWithUnpackersTest"); 
// var Splitter = artifacts.require("./Splitter");
// var SplitterSimple = artifacts.require("./SplitterSimple");
// var MoneyflowCentral = artifacts.require("./MoneyflowCentral");

var MoneyflowBasis = artifacts.require("./MoneyflowBasis");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var WeiRelativeExpense = artifacts.require("./WeiRelativeExpense");

// var SplitterStorage = artifacts.require("./SplitterStorage");
// var SplitterMain = artifacts.require("./SplitterMain");
// var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
// var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");


var CheckExceptions = require('../test/utils/checkexceptions');
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function KECCAK256 (x){
	return web3.sha3(x);
}

global.contract('Gas measurements', (accounts)=> {
	let token;
	let store;
	let daoBase;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];
	const employee3 = accounts[4];
	const employee4 = accounts[5];
	const employee5 = accounts[6];

	global.beforeEach(async() => {
	});

	// 0->•abs
	describe('One node Moneyflows', function(){
		global.it('Should send money to one-node moneyflow (abs expense)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth
		});

		global.it('Should accept less than needed money to one-node moneyflow (abs expense)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e17});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],3e17); //1node balance should be 1 eth

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e17});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],5e17); //1node balance should be 1 eth

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:5e17});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth	
		});

		global.it('Should fail on send money to one-node moneyflow (abs expense)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, false, '0x0',     // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)
			await moneyflowBasis.sendAmountToMoneyflow({value:1e18}).should.be.rejectedWith('revert');
		});

		global.it('Should send money to one-node moneyflow with no limit (rel expense with self output)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[1],[100], false,    // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, false, '0x0',     // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth
			await moneyflowBasis.sendAmountToMoneyflow({from:employee1, value:1e18});
			await moneyflowBasis.sendAmountToMoneyflow({from:employee2, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],3e18); //1node balance should be 1 eth
		});
		
		global.it('Should send money to one-node moneyflow with no limit (abs expense + rel expense with self output)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[1],[100], false,    // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, '0x0',     // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth
			await moneyflowBasis.sendAmountToMoneyflow({from:employee1, value:1e18});
			await moneyflowBasis.sendAmountToMoneyflow({from:employee2, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],3e18); //1node balance should be 1 eth
		});

		global.it('Should fail on send to not existing node', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[2],[100], false,    // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, false, '0x0',     // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, to:moneyflowBasis.address, value:1}).should.be.rejectedWith('revert');
		});

		global.it('Should autowithdraw money from output node (_isAutoWithdraw==true) in one-node moneyflow (abs expense)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,           // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,         // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, true, employee1,  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false)    // bool _isDynamic,         bool _isTokenType)

			var balance1 = await web3.eth.getBalance(employee1);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var balance2 = await web3.eth.getBalance(employee1);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 1e18	

			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 1e18);
		});

		global.it('Should fail on autowithdraw money from output node (_isAutoWithdraw==false) in one-node moneyflow (abs expense)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,            // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,          // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, employee1,  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false)     // bool _isDynamic,         bool _isTokenType)

			var balance1 = await web3.eth.getBalance(employee1);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var balance2 = await web3.eth.getBalance(employee1);
			// global.assert.equal(info[5],1e18); //1node balance should be 1 eth
			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 0);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); // 1node balance should be 1e18			
		});	

		global.it('Should get neededAmount in moneyflow from dynamic IWeiReceiver', async()=> {
			var wae = await WeiAbsoluteExpense.new(1e18);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			var balance1 = await web3.eth.getBalance(wae.address);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var balance2 = await web3.eth.getBalance(wae.address);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0	

			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 1e18);		
		});

		global.it('Should fail (too much money, rest!=0) on get neededAmount in moneyflow from dynamic IWeiReceiver', async()=> {
			var wae = await WeiAbsoluteExpense.new(1e18);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			var balance1 = await web3.eth.getBalance(wae.address);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e18}).should.be.rejectedWith('revert');	
		});	

		global.it('Should get neededAmount (multiple transactions) in moneyflow from dynamic IWeiReceiver', async()=> {
			var wae = await WeiAbsoluteExpense.new(1e18);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			var balance1 = await web3.eth.getBalance(wae.address);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e17});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e17});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:5e17});
			var balance2 = await web3.eth.getBalance(wae.address);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0	

			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 1e18);		
		});

		global.it('Should get neededAmount (and rest stay on node: self output) in moneyflow from dynamic IWeiReceiver', async()=> {
			var wae = await WeiAbsoluteExpense.new(1e18);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[1],[100], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			var balance1 = await web3.eth.getBalance(wae.address);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e18});
			var balance2 = await web3.eth.getBalance(wae.address);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],2e18); // 1node balance should be 0

			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 1e18);		
		});	

		global.it('Should fail and ignore that neededAmount!=0 (too much money, rest!=0) on get neededAmount in moneyflow from dynamic IWeiReceiver', async()=> {
			var wae = await WeiAbsoluteExpense.new(1e18);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				2e18, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			var balance1 = await web3.eth.getBalance(wae.address);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e18}).should.be.rejectedWith('revert');	
		});

		global.it('Should get neededAmount (relative expense) in moneyflow from dynamic IWeiReceiver and collect all money on node if send money again', async()=> {
			var wae = await WeiRelativeExpense.new(5000);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[1],[100], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			var balance1 = await web3.eth.getBalance(wae.address);
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var balance2 = await web3.eth.getBalance(wae.address);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],5e17); // 1node balance should be 0	

			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 5e17);

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:5e17});	
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); // 1node balance should be 0	

		});

		global.it('Should fail (no outputs for the rest) to get neededAmount (relative expense) in moneyflow from dynamic IWeiReceiver', async()=> {
			var wae = await WeiRelativeExpense.new(5000);
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,         // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,       // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, true, wae.address, // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				true, false)   	  // bool _isDynamic,         bool _isTokenType)
				
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e18}).should.be.rejectedWith('revert');	
		});

		global.it('Should send money to one-node moneyflow (abs expense periodic 24 hours), then rejected, then time passed, then send again', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], true,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 24,     // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth

			await moneyflowBasis.sendAmountToMoneyflow({value:1e18}).should.be.rejectedWith('revert');

			await web3.currentProvider.sendAsync({
				jsonrpc: '2.0', 
				method: 'evm_increaseTime',
				params: [3600 * 25 * 1000],
				id: new Date().getTime()
			}, function(err){if(err) console.log('err:', err)});

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],2e18); //1node balance should be 1 eth

			await moneyflowBasis.sendAmountToMoneyflow({value:1e18}).should.be.rejectedWith('revert');
		
			await web3.currentProvider.sendAsync({
				jsonrpc: '2.0', 
				method: 'evm_increaseTime',
				params: [3600 * 25 * 1000],
				id: new Date().getTime()
			}, function(err){if(err) console.log('err:', err)});

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],3e18); //1node balance should be 1 eth
		});	

		global.it('Should send money to one-node moneyflow (abs expense) then reject money, then flushNodeBalanceTo, then reject money again', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18}).should.be.rejectedWith('revert');
			
			var balance1 = await web3.eth.getBalance(employee1);
			await moneyflowBasis.flushNodeBalanceTo(1, employee1);
			var balance2 = await web3.eth.getBalance(employee1);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0	

			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 1e18);			

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18}).should.be.rejectedWith('revert');
		});
	});

	describe('Multinode Moneyflows', function(){
		global.it('Should send money to three-node moneyflow (abs expense) then withdraw all', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[2],[100], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(2, //uint _nodeId,
				[3],[100], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				2e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(3, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				4e18, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:7e18});
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],1e18); //1node balance should be 1 eth

			var balance1 = await web3.eth.getBalance(employee1);
			await moneyflowBasis.flushNodeBalanceTo(3, employee1);
			var balance2 = await web3.eth.getBalance(employee1);
			var info = await moneyflowBasis.getNodeInfo2(3);
			global.assert.equal(info[5],0); // 1node balance should be 0	
			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 4e18);	

			var balance1 = await web3.eth.getBalance(employee1);
			await moneyflowBasis.flushNodeBalanceTo(2, employee1);
			var balance2 = await web3.eth.getBalance(employee1);
			var info = await moneyflowBasis.getNodeInfo2(2);
			global.assert.equal(info[5],0); // 1node balance should be 0	
			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 2e18);	

			var balance1 = await web3.eth.getBalance(employee1);
			await moneyflowBasis.flushNodeBalanceTo(1, employee1);
			var balance2 = await web3.eth.getBalance(employee1);
			var info = await moneyflowBasis.getNodeInfo2(1);
			global.assert.equal(info[5],0); // 1node balance should be 0	
			global.assert.equal(balance2.toNumber() - balance1.toNumber(), 1e18);	

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e18}).should.be.rejectedWith('revert');
		});

		global.it('Should send money to three-node moneyflow (abs-rel-abs expense) then withdraw all', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[2],[100], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(2, //uint _nodeId,
				[2,3],[50,50], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(3, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				4e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)
		
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:9e10});
			global.assert.equal(await moneyflowBasis.getNodeBalance(1), 1e10);
			global.assert.equal(await moneyflowBasis.getNodeBalance(2), 4e10);
			global.assert.equal(await moneyflowBasis.getNodeBalance(3), 4e10);

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e10}).should.be.rejectedWith('revert');
		});
		global.it('Should send money to three-node moneyflow (abs-rel-abs expense) then withdraw all (same as prev but multi transactions and 75/25 splitter)', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[2],[100], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				1e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(2, //uint _nodeId,
				[2,3],[75,25], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(3, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				4e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)
		
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:3e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e10});

			global.assert.equal(await moneyflowBasis.getNodeBalance(1), 1e10);
			global.assert.equal(await moneyflowBasis.getNodeBalance(2), 12e10);
			global.assert.equal(await moneyflowBasis.getNodeBalance(3), 4e10);

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:1e10}).should.be.rejectedWith('revert');
		});
		
		global.it('Should split money in spliiter + 3 abs expense moneyflow', async()=> {
			var moneyflowBasis = await MoneyflowBasis.new();
			await moneyflowBasis.setNode(1, //uint _nodeId,
				[2,3,4],[25,25,50], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				0, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(2, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				2e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(3, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				2e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.setNode(4, //uint _nodeId,
				[],[], false,        // uint[] _outputNodeIds,   uint[] _outputParts,  bool _isPeriodic, 
				false, true, 0,      // bool _isAccumulateDebt,  bool _isActive,       uint _periodHours, 
				4e10, false, '0x0',  // uint _neededAmount,      bool _isAutoWithdraw, address _output, 
				false, false) 		 // bool _isDynamic,         bool _isTokenType)

			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e10});
			await moneyflowBasis.sendAmountToMoneyflow({from:creator, value:2e10});

			global.assert.equal(await moneyflowBasis.getNodeBalance(2), 2e10);
			global.assert.equal(await moneyflowBasis.getNodeBalance(3), 2e10);
			global.assert.equal(await moneyflowBasis.getNodeBalance(4), 4e10);
		});


	});

/*   0-> rel self output
	0-> abs-> rel-> abs
	0-> abs-> abs-> abs-> rel   */



});

