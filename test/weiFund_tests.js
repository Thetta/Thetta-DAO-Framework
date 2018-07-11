var MoneyflowTable = artifacts.require("./MoneyflowTable");

var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");
// var ConditionalFund = artifacts.require("./WeiFund2");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var CheckExceptions = require('./utils/checkexceptions');

var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var WeiRelativeExpense = artifacts.require("./WeiRelativeExpense");
var WeiAbsoluteExpenseWithPeriod = artifacts.require("./WeiAbsoluteExpenseWithPeriod");
var WeiRelativeExpenseWithPeriod = artifacts.require("./WeiRelativeExpenseWithPeriod");

const getEId=o=> o.logs.filter(l => l.event == 'elementAdded')[0].args._eId.toNumber();
const KECCAK256=x=> web3.sha3(x);

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

/*contract('ConditionalFund', (accounts) => {
	let money = web3.toWei(0.001, "ether");

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async() => {
	});

	it('Should create fund with push model',async() => {
		let neededAmount = 1e18;
		let output = employee2;
		let isAutoWithdraw = true;
		let nextTargetOutput = '0x0';
		let allowFlushTo = false;
		let isPeriodic = false;
		let periodHours = 0;

		let weiFund2 = await WeiFund2.new(neededAmount, output, isAutoWithdraw, nextTargetOutput, allowFlushTo, isPeriodic, periodHours);
		let b1 = await web3.eth.getBalance(employee2);
		await weiFund2.processFunds(5e17, {value:5e17});
		await weiFund2.processFunds(5e17, {value:5e17});
		let b2 = await web3.eth.getBalance(employee2);
		assert.equal(b2.toNumber()-b1.toNumber(), 1e18);

		await weiFund2.processFunds(5e17, {value:5e17});
		await weiFund2.processFunds(5e17, {value:5e17});
		let b3 = await web3.eth.getBalance(employee2);
		assert.equal(b3.toNumber()-b1.toNumber(), 2e18);

		await weiFund2.processFunds(5e17, {value:4e18});
		let b4 = await web3.eth.getBalance(employee2);
		assert.equal(b4.toNumber()-b1.toNumber(), 6e18);
	});

	it('Should create fund with pull model',async() => {
		let neededAmount = 1e18;
		let output = '0x0';
		let isAutoWithdraw = false;
		let allowFlushTo = false;
		let isPeriodic = false;
		let periodHours = 0;

		let weiFund2NextOutput = await WeiFund2.new(neededAmount, employee2, true, '0x0', allowFlushTo, isPeriodic, periodHours);
		let weiFund2 = await WeiFund2.new(neededAmount, employee2, false, weiFund2NextOutput.address, allowFlushTo, isPeriodic, periodHours);
		

		let b1 = await web3.eth.getBalance(employee2);
		let w1 = await web3.eth.getBalance(weiFund2.address);
		let wn1 = await web3.eth.getBalance(weiFund2NextOutput.address);

		await weiFund2.processFunds(5e17, {value:5e17});
		await weiFund2.processFunds(5e17, {value:5e17});

		let b2 = await web3.eth.getBalance(employee2);
		await weiFund2.flush();
		let b3 = await web3.eth.getBalance(employee2);
		
		let w2 = await web3.eth.getBalance(weiFund2.address);
		let wn2 = await web3.eth.getBalance(weiFund2NextOutput.address);

		assert.equal(b2.toNumber()-b1.toNumber(), 0);
		assert.equal(w2.toNumber()-w1.toNumber(), 0);
		assert.equal(wn2.toNumber()-wn1.toNumber(), 0);
		assert.equal(b3.toNumber()-b2.toNumber(), 1e18);

		await weiFund2.processFunds(5e17, {value:5e17});
		await weiFund2.processFunds(5e17, {value:5e17});
		await weiFund2.processFunds(1e18, {value:1e18});

		let w3 = await web3.eth.getBalance(weiFund2.address);
		let wn3 = await web3.eth.getBalance(weiFund2NextOutput.address);

		console.log()
		// assert.equal(w3.toNumber()-w2.toNumber(), 1e18);
		// assert.equal(wn3.toNumber()-wn2.toNumber(), 1e18);
		await weiFund2.flush();
		await weiFund2NextOutput.flush();

		let b4 = await web3.eth.getBalance(employee2);
		assert.equal(b4.toNumber()-b3.toNumber(), 2e18);
	});
});*/