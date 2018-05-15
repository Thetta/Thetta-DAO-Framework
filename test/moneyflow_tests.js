var Microcompany = artifacts.require("./Microcompany");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");
var FallbackToWeiReceiver = artifacts.require("./FallbackToWeiReceiver");

var CheckExceptions = require('./utils/checkexceptions');

var WeiTopDownSplitter = require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = require("./WeiUnsortedSplitter");

global.contract('Moneyflow', (accounts) => {
	let token;
	let store;
	let mcInstance;
	let moneyflowInstance;

	let money = web3.toWei(0.001, "ether")

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	global.beforeEach(async() => {
		token = await StdMicrocompanyToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await MicrocompanyStorage.new(token.address,{gas: 10000000, from: creator});

		// issue 1000 tokens
		mcInstance = await Microcompany.new(store.address,{gas: 10000000, from: creator});

		{
			// manually setup the Default organization 
			await store.addActionByEmployeesOnly("addNewProposal");
			await store.addActionByEmployeesOnly("startTask");
			await store.addActionByEmployeesOnly("startBounty");
			// this is a list of actions that require voting
			await store.addActionByVoting("addNewEmployee");
			await store.addActionByVoting("removeEmployee");
			await store.addActionByVoting("addNewTask");
			await store.addActionByVoting("issueTokens");
			// add creator as first employee	
			await store.addNewEmployee(creator);			
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		moneyflowInstance = await MoneyFlow.new({from: creator});
	});

	global.it('should allow to send revenue',async() => {
		// Moneyflow.getRevenueEndpointAddress() -> FallbackToWeiReceiver -> Fund
		const revEndpoint = await moneyflowInstance.getRevenueEndpointAddress();
		global.assert.equal(revEndpoint,0x0,'Endpoint should be zero');

		const isEnableFlushTo = true;
		let fund = await WeiFund.new(creator,isEnableFlushTo,{from:creator});
		global.assert.notEqual(fund.address,0x0,'Fund should be created');
		let ftwr = await FallbackToWeiReceiver.new(fund.address,{from:creator});

		await moneyflowInstance.setRootWeiReceiver(ftwr.address);

		const revEndpoint2 = await moneyflowInstance.getRevenueEndpointAddress();
		global.assert.equal(revEndpoint2,ftwr.address,'Endpoint should be non zero now');

		// now send some money to the revenue endpoint 
		web3.eth.sendTransaction({ from: creator, to: revEndpoint2, value: money})

		// money should end up in the fund

		// test fund.flush()
		let fundBalance = await web3.eth.getBalance(fund.address);
		global.assert.equal(fundBalance,1000000000000000,'Money should be transferred to the fund');
		let firstCreatorBalance = await web3.eth.getBalance(creator);
		let th = await fund.flush({from:creator, gas:1000000, gasPrice:100000000})
		let secondCreatorBalance = await web3.eth.getBalance(creator);
		let creatorBalanceDelta = secondCreatorBalance.toNumber() - firstCreatorBalance.toNumber()
		global.assert.equal(creatorBalanceDelta>0.95*money, true)
		let fundBalance2 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta = fundBalance.toNumber() - fundBalance2.toNumber()
		global.assert.equal(fundBalanceDelta>0.95*money, true)

		web3.eth.sendTransaction({ from: creator, to: revEndpoint2, value: money})

		// test fund.flushTo()
		let fundBalance3 = await web3.eth.getBalance(fund.address);
		global.assert.equal(fundBalance,money,'Money should be transferred to the fund');
		
		let firstOutsiderBalance = await web3.eth.getBalance(outsider);
		let th2 = await fund.flushTo(outsider, {from:creator, gas:1000000, gasPrice:100000000})
		let secondOutsiderBalance = await web3.eth.getBalance(outsider);
		let outsiderBalanceDelta = secondOutsiderBalance.toNumber() - firstOutsiderBalance.toNumber()

		global.assert.equal(outsiderBalanceDelta>0.95*money, true)
		let fundBalance4 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta2 = fundBalance3.toNumber() - fundBalance4.toNumber()
		global.assert.equal(fundBalanceDelta2>0.95*money, true)
	});

	global.it('should allow to get donations',async() => {
		const donationEndpoint = await moneyflowInstance.getDonationEndpointAddress();

		const isEnableFlushTo = true;
		let fund = await WeiFund.new(creator,isEnableFlushTo,{from:creator});
		// global.assert.notEqual(fund.address,0x0,'Fund should be created');
		let ftwr = await FallbackToWeiReceiver.new(fund.address,{from:creator});

		// send some money to the donation endpoint 

		web3.eth.sendTransaction({ from: creator, to: donationEndpoint, value: money})

		let donationBalance = await web3.eth.getBalance(donationEndpoint);
		global.assert.equal(donationBalance.toNumber(),money);
		
		let creatorBalance = await web3.eth.getBalance(creator);
		
		let th2 = await moneyflowInstance.setRootWeiReceiver(creator,{from:creator, gas:100000, gasPrice:0})
		let th = await moneyflowInstance.withdrawDonations({from:creator, gas:100000, gasPrice:0})
		let creatorBalance2 = await web3.eth.getBalance(creator);

		let donationBalance2 = await web3.eth.getBalance(donationEndpoint);

		global.assert.equal(donationBalance2.toNumber(),0);

		let creatorBalanceDelta = creatorBalance2.toNumber() - creatorBalance.toNumber()
		global.assert.equal(creatorBalanceDelta, money)
	});

	global.it('should process money with WeiTopDownSplitter + 3 WeiAbsoluteExpense',async() => {

		// create WeiTopDownSplitter 
		let weiTopDownSplitter = await WeiTopDownSplitter.new('JustSplitter');

		let weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*money, {from:creator, gasPrice:0});
		let weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*money, {from:creator, gasPrice:0});
		let weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*money, {from:creator, gasPrice:0});
		
		// add 3 WeiAbsoluteExpense outputs to the splitter
		let th1 = await weiTopDownSplitter.addChild(weiAbsoluteExpense1.address)
		let th2 = await weiTopDownSplitter.addChild(weiAbsoluteExpense2.address)
		let th3 = await weiTopDownSplitter.addChild(weiAbsoluteExpense3.address)

		// add WeiTopDownSplitter to the moneyflow
		let th4 = await moneyflowInstance.setRootWeiReceiver(weiTopDownSplitter.address);

		// now send some money to the revenue endpoint 
		
		// money should end up in the outputs
	});


	global.it('should process money with WeiUnsortedSplitter + 3 WeiAbsoluteExpense',async() => {
		// TODO:
		// create WeiUnsortedSplitter 
		
		// add 3 WeiAbsoluteExpense outputs to the splitter
		
		// add WeiTopDownSplitter to the moneyflow
		// await moneyflowInstance.setRootWeiReceiver(splitter.address);

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

