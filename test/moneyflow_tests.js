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

		// TODO: test fund.flush()
	});

	global.it('should allow to get donations',async() => {
		// TODO: write test
		// use getDonationEndpointAddress() to get address 
		//
		// send some money to the donation endpoint 
		//
		// withdraw that money by the creator (without voting!!!)
	});

	global.it('should process money with WeiTopDownSplitter + 3 WeiAbsoluteExpense',async() => {
		// TODO:
		// create WeiTopDownSplitter 
		
		// add 3 WeiAbsoluteExpense outputs to the splitter
		
		// add WeiTopDownSplitter to the moneyflow
		// await moneyflowInstance.setWeiReceiver(splitter.address);

		// now send some money to the revenue endpoint 
		
		// money should end up in the outputs
	});

	global.it('should process money with WeiUnsortedSplitter + 3 WeiAbsoluteExpense',async() => {
		// TODO:
		// create WeiUnsortedSplitter 
		
		// add 3 WeiAbsoluteExpense outputs to the splitter
		
		// add WeiTopDownSplitter to the moneyflow
		// await moneyflowInstance.setWeiReceiver(splitter.address);

		// now send some money to the revenue endpoint 
		
		// money should end up in the outputs
	});

	global.it('should process money with a scheme just like in the paper',async() => {
		// TODO:
		// Document is here:
		// https://docs.google.com/document/d/15UOnXM_iPudD95m-UYBcYns-SeqM2ksDecjYhZrqybQ/edit?usp=sharing
		//
		// top-down splitter 
		//		Spends - unsorted splitter
		//			Salaries - unsorted splitter 
		//				Employee1 
		//				Employee2 
		//				Employee3 
		//			Other - unsorted splitter 
		//				Office 
		//				Internet
		//			Tasks - unsorted splitter
		//				Task1
		//				Task2
		//				Task3
		//		Bonuses - unsorted splitter
		//			Employee1 
		//			Employee2 
		//			Employee3 
		//		Rest - unsorted splitter
		//			ReserveFund - fund 
		//			DividendsFund - fund
	});
});

