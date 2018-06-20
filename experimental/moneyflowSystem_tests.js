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

var MoneyflowSystem = artifacts.require("./MoneyflowSystem");

// var SplitterStorage = artifacts.require("./SplitterStorage");
// var SplitterMain = artifacts.require("./SplitterMain");
// var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
// var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");


var CheckExceptions = require('../test/utils/checkexceptions');

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

	global.it('Should estimate gas for moneyflowSystem', async()=> {
		var b1 = await web3.eth.getBalance(creator);
		var moneyflowSystem = await MoneyflowSystem.new({from: creator, gasPrice:1});
		var b2 = await web3.eth.getBalance(creator);
		console.log('MoneyflowSystem.new gas:', b1.toNumber() - b2.toNumber());

		await moneyflowSystem.setNode(0, [1,2], [10, 30], false, false, true, 0, 0);
		// uint _nodeId, 
		// uint[] _outputNodeIds,
		// uint[] _outputPercents,
		// bool _isPeriodic, 
		// bool _isAccumulateDebt, 
		// bool _isActive, 
		// uint _periodHours, 
		// uint _condensatedAmount
	});
});

