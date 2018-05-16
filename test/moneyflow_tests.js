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
var WeiRelativeExpense = artifacts.require("./WeiRelativeExpense");

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
		await fund.flush({from:creator, gas:1000000, gasPrice:0});
		let secondCreatorBalance = await web3.eth.getBalance(creator);
		let creatorBalanceDelta = secondCreatorBalance.toNumber() - firstCreatorBalance.toNumber();
		global.assert.equal(creatorBalanceDelta, money, 'creator gets all money by flush();');
		let fundBalance2 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta = fundBalance.toNumber() - fundBalance2.toNumber();
		global.assert.equal(fundBalanceDelta, money, 'fund have given all money to creator by flush();');


		await fund.processFunds(money, { from: creator, value: money});

		// test fund.flushTo();
		let fundBalance3 = await web3.eth.getBalance(fund.address);
		global.assert.equal(fundBalance,money,'Money should be transferred to the fund');
		
		let firstOutsiderBalance = await web3.eth.getBalance(outsider);
		await fund.flushTo(outsider, {from:creator, gas:1000000, gasPrice:0});
		let secondOutsiderBalance = await web3.eth.getBalance(outsider);
		let outsiderBalanceDelta = secondOutsiderBalance.toNumber() - firstOutsiderBalance.toNumber();
		global.assert.equal(outsiderBalanceDelta, money, 'outsider gets all money by flushTo();');
		
		let fundBalance4 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta2 = fundBalance3.toNumber() - fundBalance4.toNumber();
		global.assert.equal(fundBalanceDelta2, money, 'fund have given all money to creator by flushTo();');
	});

	global.it('should allow to get donations',async() => {
		const donationEndpoint = await moneyflowInstance.getDonationEndpointAddress();

		const isEnableFlushTo = true;
		let fund = await WeiFund.new(creator,isEnableFlushTo,{from:creator});
		// send some money to the donation endpoint 
		web3.eth.sendTransaction({ from: creator, to: donationEndpoint, value: money});

		let donationBalance = await web3.eth.getBalance(donationEndpoint);
		global.assert.equal(donationBalance.toNumber(),money, 'all money at donation point now');
		
		let creatorBalance = await web3.eth.getBalance(creator);
		await moneyflowInstance.setRootWeiReceiver(creator,{from:creator, gas:100000, gasPrice:0})
		
		// get the donations 
		// donation will go to the root receiver
		await moneyflowInstance.withdrawDonations({from:creator, gas:100000, gasPrice:0});
		let creatorBalance2 = await web3.eth.getBalance(creator);
		let donationBalance2 = await web3.eth.getBalance(donationEndpoint);

		global.assert.equal(donationBalance2.toNumber(),0, 'all donations now on creator`s balance');

		let creatorBalanceDelta = creatorBalance2.toNumber() - creatorBalance.toNumber();
		global.assert.equal(creatorBalanceDelta, money, 'all donations now on creator`s balance');
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
		
		global.assert.equal(revenueEndpointAddress, weiTopDownSplitter.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint 
		await weiTopDownSplitter.processFunds(6*money, {value:6*money, from:creator});

		// money should end up in the outputs
		let weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		global.assert.equal(weiAbsoluteExpense1Balance.toNumber(),1*money, 'resource point received money from splitter');
		
		let weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		global.assert.equal(weiAbsoluteExpense2Balance.toNumber(),2*money, 'resource point received money from splitter');
		
		let weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		global.assert.equal(weiAbsoluteExpense3Balance.toNumber(),3*money, 'resource point received money from splitter')
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
		
		global.assert.equal(revenueEndpointAddress, weiUnsortedSplitter.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint 
		await weiUnsortedSplitter.processFunds(6*money, {value:6*money, from:creator});

		// money should end up in the outputs
		let weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		global.assert.equal(weiAbsoluteExpense1Balance.toNumber(),1*money, 'resource point received money from splitter');
		
		let weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		global.assert.equal(weiAbsoluteExpense2Balance.toNumber(),2*money, 'resource point received money from splitter');
		
		let weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		global.assert.equal(weiAbsoluteExpense3Balance.toNumber(),3*money, 'resource point received money from splitter');
	});

	global.it('should process money with a scheme just like in the paper',async() => {
		// Document is here: https://docs.google.com/document/d/15UOnXM_iPudD95m-UYBcYns-SeqM2ksDecjYhZrqybQ/edit?usp=sharing
		
		// STRUCTURE
		let AllOutpults = await WeiTopDownSplitter.new('AllOutpults', {from:creator, gasPrice:0});
			let Spends = await WeiUnsortedSplitter.new('Spends', {from:creator, gasPrice:0});
				let Salaries = await WeiUnsortedSplitter.new('Salaries', {from:creator, gasPrice:0});
					let Employee1 = await WeiAbsoluteExpense.new(1000*money, {from:creator, gasPrice:0});
					let Employee2 = await WeiAbsoluteExpense.new(1500*money, {from:creator, gasPrice:0});
					let Employee3 = await WeiAbsoluteExpense.new(800*money, {from:creator, gasPrice:0});
				let Other = await WeiUnsortedSplitter.new('Other', {from:creator, gasPrice:0});
					let Office = await WeiAbsoluteExpense.new(500*money, {from:creator, gasPrice:0});
					let Internet = await WeiAbsoluteExpense.new(300*money, {from:creator, gasPrice:0});
				let Tasks = await WeiUnsortedSplitter.new('Tasks', {from:creator, gasPrice:0});
					let Task1 = await WeiAbsoluteExpense.new(500*money, {from:creator, gasPrice:0});
					let Task2 = await WeiAbsoluteExpense.new(300*money, {from:creator, gasPrice:0});
					let Task3 = await WeiAbsoluteExpense.new(1000*money, {from:creator, gasPrice:0});
			let Bonuses = await WeiUnsortedSplitter.new('Bonuses', {from:creator, gasPrice:0});
				let Bonus1 = await WeiRelativeExpense.new(100, {from:creator, gasPrice:0});
				let Bonus2 = await WeiRelativeExpense.new(100, {from:creator, gasPrice:0});
				let Bonus3 = await WeiRelativeExpense.new(200, {from:creator, gasPrice:0});
			let Rest = await WeiUnsortedSplitter.new('Rest', {from:creator, gasPrice:0});
				let ReserveFund = await WeiRelativeExpense.new(7500, {from:creator, gasPrice:0});
				let DividendsFund = await WeiRelativeExpense.new(2500, {from:creator, gasPrice:0});
		
		// CONNECTIONS
		await AllOutpults.addChild(Spends.address, {from:creator, gas:1000000, gasPrice:0});
			await Spends.addChild(Salaries.address);
				await Salaries.addChild(Employee1.address, {from:creator, gas:1000000, gasPrice:0});
				await Salaries.addChild(Employee2.address, {from:creator, gas:1000000, gasPrice:0});
				await Salaries.addChild(Employee3.address, {from:creator, gas:1000000, gasPrice:0});
			// await AllOutpults.addChild(Other.address);
			// 	await Other.addChild(Office.address);
			// 	await Other.addChild(Internet.address);
			// await AllOutpults.addChild(Tasks.address);
			// 	await Tasks.addChild(Task1.address);
			// 	await Tasks.addChild(Task2.address);
			// 	await Tasks.addChild(Task3.address);			
		// await AllOutpults.addChild(Bonuses.address);
		// 	await Bonuses.addChild(Bonus1.address);
		// 	await Bonuses.addChild(Bonus2.address);
		// 	await Bonuses.addChild(Bonus3.address);
		// await AllOutpults.addChild(Rest.address);
		// 	await Rest.addChild(ReserveFund.address);
		// 	await Rest.addChild(DividendsFund.address);

		// await moneyflowInstance.setRootWeiReceiver(AllOutpults.address);
		// let revenueEndpointAddress = await moneyflowInstance.getRevenueEndpointAddress();	
		// global.assert.equal(revenueEndpointAddress, AllOutpults.address, 'AllOutpults.address saved in moneyflowInstance as revenueEndpointAddress');

		let AllOutpultsNeeds = await AllOutpults.getTotalWeiNeeded(3300*money);
		console.log('AllOutpultsNeeds:', AllOutpultsNeeds.toNumber())

		let MinOutpultsNeeds = await AllOutpults.getMinWeiNeeded();
		console.log('MinOutpultsNeeds:', MinOutpultsNeeds.toNumber())

		let OutputChildrenCount = await AllOutpults.getChildrenCount();
		console.log('OutputChildrenCount:', OutputChildrenCount.toNumber())

		let SpendsChildrenCount = await Spends.getChildrenCount();
		console.log('SpendsChildrenCount:', SpendsChildrenCount.toNumber())

		let SalariesChildrenCount = await Salaries.getChildrenCount();
		console.log('SalariesChildrenCount:', SalariesChildrenCount.toNumber())

		console.log('money:', money)
		let th = await AllOutpults.processFunds(3300*money, {value:3300*money, from:creator, gas:1000000, gasPrice:0});



// console.log('Spends min:', await Spends.getTotalWeiNeeded(1000*money), 'min:', await Spends.getMinWeiNeeded())
// console.log('Salaries min:', await Salaries.getTotalWeiNeeded(1000*money), 'min:', await Salaries.getMinWeiNeeded())
// console.log('Other min:', await Other.getTotalWeiNeeded(1000*money), 'min:', await Other.getMinWeiNeeded())
// console.log('Tasks min:', await Tasks.getTotalWeiNeeded(1000*money), 'min:', await Tasks.getMinWeiNeeded())
// console.log('Bonuses min:', await Bonuses.getTotalWeiNeeded(1000*money), 'min:', await Bonuses.getMinWeiNeeded())
// console.log('Rest min:', await Rest.getTotalWeiNeeded(1000*money), 'min:', await Rest.getMinWeiNeeded())

	});
});

