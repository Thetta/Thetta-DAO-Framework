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

	global.it('should process money in structure o-> o-> o-o-o',async() => {
		let AllOutpults = await WeiTopDownSplitter.new('AllOutpults', {from:creator, gasPrice:0});
		let Salaries = await WeiUnsortedSplitter.new('Salaries', {from:creator, gasPrice:0});

		let Employee1 = await WeiAbsoluteExpense.new(1000*money, {from:creator, gasPrice:0});
		let Employee2 = await WeiAbsoluteExpense.new(1500*money, {from:creator, gasPrice:0});
		let Employee3 = await WeiAbsoluteExpense.new(800*money, {from:creator, gasPrice:0});		

		await AllOutpults.addChild(Salaries.address, {from:creator, gas:1000000, gasPrice:0});

		await Salaries.addChild(Employee1.address, {from:creator, gas:1000000, gasPrice:0});
		await Salaries.addChild(Employee2.address, {from:creator, gas:1000000, gasPrice:0});
		await Salaries.addChild(Employee3.address, {from:creator, gas:1000000, gasPrice:0});

		let Employee1Needs = await Employee1.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 1000, 'Employee1 Needs 1000 money' )
		let Employee2Needs = await Employee2.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 1500, 'Employee1 Needs 1000 money' )
		let Employee3Needs = await Employee3.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 800, 'Employee1 Needs 1000 money' )

		let SalariesNeeds = await Salaries.getTotalWeiNeeded(3300*money);
			global.assert.equal(SalariesNeeds.toNumber()/money, 5900, 'Salaries Needs 5900 money' )

		let SalariesMinNeeds = await Salaries.getMinWeiNeeded();
			global.assert.equal(SalariesNeeds.toNumber()/money, 5900, 'Salaries min Needs 5900 money' )

		let AllOutpultsNeeds = await AllOutpults.getTotalWeiNeeded(3300*money);
			global.assert.equal(AllOutpultsNeeds.toNumber()/money, 5900, 'AllOutpults Needs 5900 money' )
		let MinOutpultsNeeds = await AllOutpults.getMinWeiNeeded();
			global.assert.equal(AllOutpultsNeeds.toNumber()/money, 5900, 'AllOutpults Needs min 5900 money' )
		let OutputChildrenCount = await AllOutpults.getChildrenCount();
			global.assert.equal(OutputChildrenCount.toNumber(), 1, 'OutputChildrenCount should be 1')
		let SalariesChildrenCount = await Salaries.getChildrenCount();
			global.assert.equal(SalariesChildrenCount.toNumber(), 3, 'SalariesChildrenCount should be 3')

		console.log('money:', money)
		let th = await Salaries.processFunds(3300*money, {value:3300*money, from:creator, gas:1000000, gasPrice:0});

	})

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
			await Spends.addChild(Salaries.address, {from:creator, gas:1000000, gasPrice:0});
				await Salaries.addChild(Employee1.address, {from:creator, gas:1000000, gasPrice:0});
				await Salaries.addChild(Employee2.address, {from:creator, gas:1000000, gasPrice:0});
				await Salaries.addChild(Employee3.address, {from:creator, gas:1000000, gasPrice:0});
			await Spends.addChild(Other.address, {from:creator, gas:1000000, gasPrice:0});
				await Other.addChild(Office.address, {from:creator, gas:1000000, gasPrice:0});
				await Other.addChild(Internet.address, {from:creator, gas:1000000, gasPrice:0});
			await Spends.addChild(Tasks.address, {from:creator, gas:1000000, gasPrice:0});
				await Tasks.addChild(Task1.address, {from:creator, gas:1000000, gasPrice:0});
				await Tasks.addChild(Task2.address, {from:creator, gas:1000000, gasPrice:0});
				await Tasks.addChild(Task3.address, {from:creator, gas:1000000, gasPrice:0});			
		await AllOutpults.addChild(Bonuses.address, {from:creator, gas:1000000, gasPrice:0});
			await Bonuses.addChild(Bonus1.address, {from:creator, gas:1000000, gasPrice:0});
			await Bonuses.addChild(Bonus2.address, {from:creator, gas:1000000, gasPrice:0});
			await Bonuses.addChild(Bonus3.address, {from:creator, gas:1000000, gasPrice:0});
		await AllOutpults.addChild(Rest.address, {from:creator, gas:1000000, gasPrice:0});
			await Rest.addChild(ReserveFund.address, {from:creator, gas:1000000, gasPrice:0});
			await Rest.addChild(DividendsFund.address, {from:creator, gas:1000000, gasPrice:0});

		let Employee1Needs = await Employee1.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 1000, 'Employee1 Needs 1000 money' )
		let Employee2Needs = await Employee2.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 1500, 'Employee1 Needs 1000 money' )
		let Employee3Needs = await Employee3.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 800, 'Employee1 Needs 1000 money' )

		let AllOutpultsTotalNeed = await AllOutpults.getTotalWeiNeeded(30900*money, {from:creator});
		let AllOutpultsMinNeed = await AllOutpults.getMinWeiNeeded();
		let AllOutpultsChildrenCount = await AllOutpults.getChildrenCount();
			
			global.assert.equal(AllOutpultsChildrenCount.toNumber(), 5900, 'Children count should be 3');		
			global.assert.equal(AllOutpultsTotalNeed.toNumber()/money, 30900, 'AllOutpults Total Need should be 30900');
			global.assert.equal(AllOutpultsMinNeed.toNumber()/money, 5900, 'AllOutpults Total Need should be 0');

		let SpendsTotalNeed = await Spends.getTotalWeiNeeded(30900*money, {from:creator});
		let SpendsMinNeed = await Spends.getMinWeiNeeded();
		let SpendsChildrenCount = await Spends.getChildrenCount();

			global.assert.equal(SpendsChildrenCount.toNumber(), 5900, 'Children count should be 3');
			global.assert.equal(SpendsTotalNeed.toNumber()/money, 5900, 'Spends Total Need should be 30900');
			global.assert.equal(SpendsMinNeed.toNumber()/money, 0, 'Spends Total Need should be 0');

		let SalariesTotalNeed = await Salaries.getTotalWeiNeeded(30900*money, {from:creator});
		let SalariesMinNeed = await Salaries.getMinWeiNeeded();
		let SalariesChildrenCount = await Salaries.getChildrenCount();

			global.assert.equal(SalariesChildrenCount.toNumber(), 3300, 'Children count should be 3');
			global.assert.equal(SalariesTotalNeed.toNumber()/money, 3300, 'Salaries Total Need should be 30900');
			global.assert.equal(SalariesMinNeed.toNumber()/money, 0, 'Salaries Total Need should be 0');

		let OtherTotalNeed = await Other.getTotalWeiNeeded(30900*money, {from:creator});
		let OtherMinNeed = await Other.getMinWeiNeeded();
		let OtherChildrenCount = await Other.getChildrenCount();

			global.assert.equal(OtherChildrenCount.toNumber(), 800, 'Children count should be 3');
			global.assert.equal(OtherTotalNeed.toNumber()/money, 800, 'Other Total Need should be 30900');
			global.assert.equal(OtherMinNeed.toNumber()/money, 0, 'Other Total Need should be 0');

		let TasksTotalNeed = await Tasks.getTotalWeiNeeded(30900*money, {from:creator});
		let TasksMinNeed = await Tasks.getMinWeiNeeded();
		let TasksChildrenCount = await Tasks.getChildrenCount();

			global.assert.equal(TasksChildrenCount.toNumber(), 1800, 'Children count should be 3');
			global.assert.equal(TasksTotalNeed.toNumber()/money, 1800, 'Tasks Total Need should be 30900');
			global.assert.equal(TasksMinNeed.toNumber()/money, 0, 'Tasks Total Need should be 0');

		let BonusesTotalNeed = await Bonuses.getTotalWeiNeeded(30900*money, {from:creator});
		let BonusesMinNeed = await Bonuses.getMinWeiNeeded();
		let BonusesChildrenCount = await Bonuses.getChildrenCount();

			global.assert.equal(BonusesChildrenCount.toNumber(), 0, 'Children count should be 3');
			global.assert.equal(BonusesTotalNeed.toNumber()/money, 1236, 'Bonuses Total Need should be 30900');
			global.assert.equal(BonusesMinNeed.toNumber()/money, 0, 'Bonuses Total Need should be 0');

		let RestTotalNeed = await Rest.getTotalWeiNeeded(30900*money, {from:creator});
		let RestMinNeed = await Rest.getMinWeiNeeded();
		let RestChildrenCount = await Rest.getChildrenCount();

			global.assert.equal(RestChildrenCount.toNumber(), 0, 'Children count should be 3');
			global.assert.equal(RestTotalNeed.toNumber()/money, 30900, 'Bonuses Total Need should be 30900');
			global.assert.equal(RestMinNeed.toNumber()/money, 0, 'Bonuses Total Need should be 0');


		let th = await AllOutpults.processFunds(5900*money, {value:5900*money, from:creator, gas:1000000, gasPrice:0});

	});
});

