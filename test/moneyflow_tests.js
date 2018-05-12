var Microcompany = artifacts.require("./Microcompany");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");
var FallbackToWeiReceiver = artifacts.require("./FallbackToWeiReceiver");

var CheckExceptions = require('./utils/checkexceptions');

global.contract('Moneyflow', (accounts) => {
	let mcStorage;
	let mcInstance;
	let moneyflowInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		// issue 1000 tokens
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
		//mcInstance.setAutoActionCallerAddress(aacInstance.address);
		moneyflowInstance = await MoneyFlow.new({from: creator});
	});

	global.it('should allow to get donations',async() => {
		// TODO: write test
	});

	global.it('should allow to send revenue',async() => {
		// Moneyflow.getRevenueEndpointAddress() -> FallbackToWeiReceiver -> Fund
		const revEndpoint = await moneyflowInstance.getRevenueEndpointAddress();
		global.assert.equal(revEndpoint,0x0,'Endpoint should be zero');

		let fund = await WeiFund.new(creator,{from:creator});
		global.assert.notEqual(fund.address,0x0,'Fund should be created');
		let ftwr = await FallbackToWeiReceiver.new(fund.address,{from:creator});

		await moneyflowInstance.setWeiReceiver(ftwr.address);

		const revEndpoint2 = await moneyflowInstance.getRevenueEndpointAddress();
		global.assert.equal(revEndpoint2,ftwr.address,'Endpoint should be non zero now');

		// now send some money to the revenue endpoint 
		web3.eth.sendTransaction({ from: creator, to: revEndpoint2, value: web3.toWei(0.001, "ether")})

		// money should end up in the fund
		const balance = await web3.eth.getBalance(fund.address);
		global.assert.equal(balance,1000000000000000,'Money should be transferred to the fund');
	});
});

