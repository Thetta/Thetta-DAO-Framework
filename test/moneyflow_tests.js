var Microcompany = artifacts.require("./Microcompany");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");
var FallbackToWeiReceiver = artifacts.require("./FallbackToWeiReceiver");

var CheckExceptions = require('./utils/checkexceptions');

var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");

global.contract('Moneyflow', (accounts) => {
	let token;
	let store;
	let mcInstance;
	let moneyflowInstance;

	let money = web3.toWei(0.001, "ether");

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
			await store.addActionByVoting("upgradeMicrocompany");
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
		// let ftwr = await FallbackToWeiReceiver.new(fund.address,{from:creator});

		await moneyflowInstance.setRootWeiReceiver(fund.address);

		const revEndpoint2 = await moneyflowInstance.getRevenueEndpointAddress();
		global.assert.equal(revEndpoint2,fund.address,'Endpoint should be non zero now');

		// now send some money to the revenue endpoint 
		await fund.processFunds(money, { from: creator, value: money});

		// money should end up in the fund

		// test fund.flush();
		let fundBalance = await web3.eth.getBalance(fund.address);
		global.assert.equal(fundBalance,1000000000000000,'Money should be transferred to the fund');
		let firstCreatorBalance = await web3.eth.getBalance(creator);
<<<<<<< HEAD
		let th = await fund.flush({from:creator, gas:1000000, gasPrice:100000000});
=======
		await fund.flush({from:creator, gas:1000000, gasPrice:100000000})
>>>>>>> f253a573632e929ea08a11f1cb8c76e94f3e8863
		let secondCreatorBalance = await web3.eth.getBalance(creator);
		let creatorBalanceDelta = secondCreatorBalance.toNumber() - firstCreatorBalance.toNumber();
		global.assert.equal(creatorBalanceDelta>0.95*money, true);
		let fundBalance2 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta = fundBalance.toNumber() - fundBalance2.toNumber();
		global.assert.equal(fundBalanceDelta>0.95*money, true);


		await fund.processFunds(money, { from: creator, value: money});

		// test fund.flushTo();
		let fundBalance3 = await web3.eth.getBalance(fund.address);
		global.assert.equal(fundBalance,money,'Money should be transferred to the fund');
		
		let firstOutsiderBalance = await web3.eth.getBalance(outsider);
<<<<<<< HEAD
		let th2 = await fund.flushTo(outsider, {from:creator, gas:1000000, gasPrice:100000000});
=======
		await fund.flushTo(outsider, {from:creator, gas:1000000, gasPrice:100000000})
>>>>>>> f253a573632e929ea08a11f1cb8c76e94f3e8863
		let secondOutsiderBalance = await web3.eth.getBalance(outsider);
		let outsiderBalanceDelta = secondOutsiderBalance.toNumber() - firstOutsiderBalance.toNumber();

		global.assert.equal(outsiderBalanceDelta>0.95*money, true);
		let fundBalance4 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta2 = fundBalance3.toNumber() - fundBalance4.toNumber();
		global.assert.equal(fundBalanceDelta2>0.95*money, true);
	});

	global.it('should allow to get donations',async() => {
		const donationEndpoint = await moneyflowInstance.getDonationEndpointAddress();

		const isEnableFlushTo = true;
		let fund = await WeiFund.new(creator,isEnableFlushTo,{from:creator});
<<<<<<< HEAD
		// global.assert.notEqual(fund.address,0x0,'Fund should be created');
		// let ftwr = await FallbackToWeiReceiver.new(fund.address,{from:creator});

		// send some money to the donation endpoint 

		web3.eth.sendTransaction({ from: creator, to: donationEndpoint, value: money});
=======

		// send some money to the donation endpoint 
		web3.eth.sendTransaction({ from: creator, to: donationEndpoint, value: money})
>>>>>>> f253a573632e929ea08a11f1cb8c76e94f3e8863

		let donationBalance = await web3.eth.getBalance(donationEndpoint);
		global.assert.equal(donationBalance.toNumber(),money);
		
		let creatorBalance = await web3.eth.getBalance(creator);
		await moneyflowInstance.setRootWeiReceiver(creator,{from:creator, gas:100000, gasPrice:0})
		
<<<<<<< HEAD
		let th2 = await moneyflowInstance.setRootWeiReceiver(creator,{from:creator, gas:100000, gasPrice:0});
		let th = await moneyflowInstance.withdrawDonations({from:creator, gas:100000, gasPrice:0});
=======
		// get the donations 
		// donation will go to the root receiver
		await moneyflowInstance.withdrawDonations({from:creator, gas:100000, gasPrice:0})
>>>>>>> f253a573632e929ea08a11f1cb8c76e94f3e8863
		let creatorBalance2 = await web3.eth.getBalance(creator);
		let donationBalance2 = await web3.eth.getBalance(donationEndpoint);

		global.assert.equal(donationBalance2.toNumber(),0);

		let creatorBalanceDelta = creatorBalance2.toNumber() - creatorBalance.toNumber();
		global.assert.equal(creatorBalanceDelta, money);
	});

	global.it('should process money with WeiTopDownSplitter + 3 WeiAbsoluteExpense',async() => {
		// create WeiTopDownSplitter 
		let weiTopDownSplitter = await WeiTopDownSplitter.new('JustSplitter');

		let weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*money, {from:creator, gasPrice:0});
		let weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*money, {from:creator, gasPrice:0});
		let weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*money, {from:creator, gasPrice:0});
		
		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTopDownSplitter.addChild(weiAbsoluteExpense1.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense2.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense3.address);

		// add WeiTopDownSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiTopDownSplitter.address);

		let revenueEndpointAddress = await moneyflowInstance.getRevenueEndpointAddress();
		
		global.assert.equal(revenueEndpointAddress, weiTopDownSplitter.address);

		// now send some money to the revenue endpoint 
		await weiTopDownSplitter.processFunds(6*money, {value:6*money, from:creator});

		// money should end up in the outputs
		let weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		global.assert.equal(weiAbsoluteExpense1Balance.toNumber(),1*money);
		
		let weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		global.assert.equal(weiAbsoluteExpense2Balance.toNumber(),2*money);
		
		let weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		global.assert.equal(weiAbsoluteExpense3Balance.toNumber(),3*money)		
	});

	global.it('should process money with WeiUnsortedSplitter + 3 WeiAbsoluteExpense',async() => {
		// create WeiUnsortedSplitter 
		let weiUnsortedSplitter = await WeiUnsortedSplitter.new('JustSplitter');

		let weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*money, {from:creator, gasPrice:0});
		let weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*money, {from:creator, gasPrice:0});
		let weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*money, {from:creator, gasPrice:0});
		
		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense1.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense2.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense3.address);

		// add WeiUnsortedSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiUnsortedSplitter.address);

		let revenueEndpointAddress = await moneyflowInstance.getRevenueEndpointAddress();
		
		global.assert.equal(revenueEndpointAddress, weiUnsortedSplitter.address);

		// now send some money to the revenue endpoint 
		await weiUnsortedSplitter.processFunds(6*money, {value:6*money, from:creator});

		// money should end up in the outputs
		let weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		global.assert.equal(weiAbsoluteExpense1Balance.toNumber(),1*money);
		
		let weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		global.assert.equal(weiAbsoluteExpense2Balance.toNumber(),2*money);
		
		let weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		global.assert.equal(weiAbsoluteExpense3Balance.toNumber(),3*money)	
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

