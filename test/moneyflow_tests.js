var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var CheckExceptions = require('./utils/checkexceptions');

var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var WeiRelativeExpense = artifacts.require("./WeiRelativeExpense");
var WeiAbsoluteExpenseWithPeriod = artifacts.require("./WeiAbsoluteExpenseWithPeriod");
var WeiRelativeExpenseWithPeriod = artifacts.require("./WeiRelativeExpenseWithPeriod");

function KECCAK256 (x){
	return web3.sha3(x);
}

async function createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	let callParams = {from:creator, gasPrice:0}
	let o = {};

	o.AllOutpults = await WeiTopDownSplitter.new('AllOutpults', callParams);
		o.Spends = await WeiUnsortedSplitter.new('Spends', callParams);
			o.Salaries = await WeiUnsortedSplitter.new('Salaries', callParams);
				o.Employee1 = await WeiAbsoluteExpense.new(e1*money, callParams);
				o.Employee2 = await WeiAbsoluteExpense.new(e2*money, callParams);
				o.Employee3 = await WeiAbsoluteExpense.new(e3*money, callParams);
			o.Other = await WeiUnsortedSplitter.new('Other', callParams);
				o.Office = await WeiAbsoluteExpense.new(office*money, callParams);
				o.Internet = await WeiAbsoluteExpense.new(internet*money, callParams);
			o.Tasks = await WeiUnsortedSplitter.new('Tasks', callParams);
				o.Task1 = await WeiAbsoluteExpense.new(t1*money, callParams);
				o.Task2 = await WeiAbsoluteExpense.new(t2*money, callParams);
				o.Task3 = await WeiAbsoluteExpense.new(t3*money, callParams);
		o.Bonuses = await WeiUnsortedSplitter.new('Bonuses', callParams);
			o.Bonus1 = await WeiRelativeExpense.new(b1, callParams);
			o.Bonus2 = await WeiRelativeExpense.new(b2, callParams);
			o.Bonus3 = await WeiRelativeExpense.new(b3, callParams);
		o.Rest = await WeiUnsortedSplitter.new('Rest', callParams);
			o.ReserveFund = await WeiFund.new(creator, false, reserve, callParams);
			o.DividendsFund = await WeiFund.new(creator, false, dividends, callParams);

	// CONNECTIONS
	await o.AllOutpults.addChild(o.Spends.address, callParams);
		await o.Spends.addChild(o.Salaries.address, callParams);
			await o.Salaries.addChild(o.Employee1.address, callParams);
			await o.Salaries.addChild(o.Employee2.address, callParams);
			await o.Salaries.addChild(o.Employee3.address, callParams);
		await o.Spends.addChild(o.Other.address, callParams);
			await o.Other.addChild(o.Office.address, callParams);
			await o.Other.addChild(o.Internet.address, callParams);
		await o.Spends.addChild(o.Tasks.address, callParams);
			await o.Tasks.addChild(o.Task1.address, callParams);
			await o.Tasks.addChild(o.Task2.address, callParams);
			await o.Tasks.addChild(o.Task3.address, callParams);
	await o.AllOutpults.addChild(o.Bonuses.address, callParams);
		await o.Bonuses.addChild(o.Bonus1.address, callParams);
		await o.Bonuses.addChild(o.Bonus2.address, callParams);
		await o.Bonuses.addChild(o.Bonus3.address, callParams);
	await o.AllOutpults.addChild(o.Rest.address, callParams);
		await o.Rest.addChild(o.ReserveFund.address, callParams);
		await o.Rest.addChild(o.DividendsFund.address, callParams);

	return o;
}

async function totalAndMinNeedsAsserts(i, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	let totalSpend = e1+e2+e3 + t1+t2+t3 + office+internet;
	let bonusesSpendPercent = (CURRENT_INPUT - totalSpend)/10000;
	let fundsPercent = (CURRENT_INPUT-totalSpend-bonusesSpendPercent*(b1+b2+b3))/10000;

	let allNeeds = totalSpend + bonusesSpendPercent*(b1+b2+b3) + fundsPercent*(reserve+dividends);

	assert.equal(i.AllOutpultsTotalNeed.toNumber()/money, allNeeds, `AllOutpults Total Need should be ${allNeeds}`);
	assert.equal(i.AllOutpultsMinNeed.toNumber()/money, totalSpend, `AllOutpults min Need should be ${totalSpend}`);
	assert.equal(i.SpendsTotalNeed.toNumber()/money, totalSpend, `Spends Total Need should be ${totalSpend}`);
	assert.equal(i.SpendsMinNeed.toNumber()/money, totalSpend, `Spends min Need should be ${totalSpend}`);
	assert.equal(i.SalariesTotalNeed.toNumber()/money, e1+e2+e3, `Salaries Total Need should be ${e1+e2+e3}`);
	assert.equal(i.SalariesMinNeed.toNumber()/money, e1+e2+e3, `Salaries min Need should be ${e1+e2+e3}`);
	assert.equal(i.OtherTotalNeed.toNumber()/money, office+internet, `Other Total Need should be ${office+internet}`);
	assert.equal(i.OtherMinNeed.toNumber()/money, office+internet, `Other min Need should be ${office+internet}`);
	assert.equal(i.TasksTotalNeed.toNumber()/money, t1+t2+t3, `Tasks Total Need should be ${t1+t2+t3}`);
	assert.equal(i.TasksMinNeed.toNumber()/money, t1+t2+t3, `Tasks min Need should be ${t1+t2+t3}`);
	assert.equal(i.BonusesTotalNeed.toNumber()/money, (b1+b2+b3)*CURRENT_INPUT/10000, `Bonuses Total Need should be ${(b1+b2+b3)*CURRENT_INPUT/10000}`);
	assert.equal(i.BonusesMinNeed.toNumber()/money, 0, `Bonuses min Need should be ${0}`);
	assert.equal(i.RestTotalNeed.toNumber()/money, (reserve+dividends)*CURRENT_INPUT/10000, `Rest Total Need should be ${(reserve+dividends)*CURRENT_INPUT/10000}`);
	assert.equal(i.RestMinNeed.toNumber()/money, 0, `Rest min Need should be ${0}`);
}


async function getBalances(i){
	let o = {};
	o.Employee1Balance = await web3.eth.getBalance(i.Employee1.address);
	o.Employee2Balance = await web3.eth.getBalance(i.Employee2.address);
	o.Employee3Balance = await web3.eth.getBalance(i.Employee3.address);
	o.OfficeBalance = await web3.eth.getBalance(i.Office.address);
	o.InternetBalance = await web3.eth.getBalance(i.Internet.address);
	o.Task1Balance = await web3.eth.getBalance(i.Task1.address);
	o.Task2Balance = await web3.eth.getBalance(i.Task2.address);
	o.Task3Balance = await web3.eth.getBalance(i.Task3.address);
	o.Reserve3Balance = await web3.eth.getBalance(i.ReserveFund.address);
	o.Dividends3Balance = await web3.eth.getBalance(i.DividendsFund.address);
	o.Bonus1Balance = await web3.eth.getBalance(i.Bonus1.address);
	o.Bonus2Balance = await web3.eth.getBalance(i.Bonus2.address);
	o.Bonus3Balance = await web3.eth.getBalance(i.Bonus3.address);
	o.AllOutpultsBalance = await web3.eth.getBalance(i.AllOutpults.address);
	o.SpendsBalance = await web3.eth.getBalance(i.Spends.address);
	o.SalariesBalance = await web3.eth.getBalance(i.Salaries.address);
	o.OtherBalance = await web3.eth.getBalance(i.Other.address);
	o.TasksBalance = await web3.eth.getBalance(i.Tasks.address);
	o.BonusesBalance = await web3.eth.getBalance(i.Bonuses.address);
	o.RestBalance = await web3.eth.getBalance(i.Rest.address);

	return o;
}

async function getSplitterParams(i, CURRENT_INPUT, money, creator){
	let o = {}
	o.AllOutpultsTotalNeed = await i.AllOutpults.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.AllOutpultsMinNeed = await i.AllOutpults.getMinWeiNeeded();
	o.AllOutpultsChildrenCount = await i.AllOutpults.getChildrenCount();
	o.SpendsTotalNeed = await i.Spends.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.SpendsMinNeed = await i.Spends.getMinWeiNeeded();
	o.SpendsChildrenCount = await i.Spends.getChildrenCount();
	o.SalariesTotalNeed = await i.Salaries.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.SalariesMinNeed = await i.Salaries.getMinWeiNeeded();
	o.SalariesChildrenCount = await i.Salaries.getChildrenCount();
	o.OtherTotalNeed = await i.Other.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.OtherMinNeed = await i.Other.getMinWeiNeeded();
	o.OtherChildrenCount = await i.Other.getChildrenCount();
	o.TasksTotalNeed = await i.Tasks.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.TasksMinNeed = await i.Tasks.getMinWeiNeeded();
	o.TasksChildrenCount = await i.Tasks.getChildrenCount();
	o.BonusesTotalNeed = await i.Bonuses.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.BonusesMinNeed = await i.Bonuses.getMinWeiNeeded();
	o.BonusesChildrenCount = await i.Bonuses.getChildrenCount();
	o.RestTotalNeed = await i.Rest.getTotalWeiNeeded(CURRENT_INPUT*money, {from:creator});
	o.RestMinNeed = await i.Rest.getMinWeiNeeded();
	o.RestChildrenCount = await i.Rest.getChildrenCount();

	return o;
}

async function structureAsserts(i){
	assert.equal(i.AllOutpultsChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.SpendsChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.SalariesChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.OtherChildrenCount.toNumber(), 2, 'Children count should be 2');
	assert.equal(i.TasksChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.BonusesChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.RestChildrenCount.toNumber(), 2, 'Children count should be 2');
}

async function balancesAsserts(i, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	let totalSpend = e1+e2+e3 + t1+t2+t3 + office+internet;
	let bonusesSpendPercent = (CURRENT_INPUT - totalSpend)/10000;
	let fundsPercent = (CURRENT_INPUT-totalSpend-bonusesSpendPercent*(b1+b2+b3))/10000;

	assert.equal(i.Employee1Balance.toNumber()/money, e1, `Employee1 balance should be ${e1} money`);
	assert.equal(i.Employee2Balance.toNumber()/money, e2, `Employee2 balance should be ${e2} money`);
	assert.equal(i.Employee3Balance.toNumber()/money, e3, `Employee3 balance should be ${e3} money`);
	assert.equal(i.OfficeBalance.toNumber()/money, office, `Office balance should be ${office} money`);
	assert.equal(i.InternetBalance.toNumber()/money, internet, `Internet balance should be ${internet} money`);
	assert.equal(i.Task1Balance.toNumber()/money, t1, `Task1 balance should be ${t1} money`);
	assert.equal(i.Task2Balance.toNumber()/money, t2, `Task2 balance should be ${t2} money`);
	assert.equal(i.Task3Balance.toNumber()/money, t3, `Task3 balance should be ${t3} money`);

	assert.equal(i.Bonus1Balance.toNumber()/money, bonusesSpendPercent*b1, `Bonus1 balance should be ${bonusesSpendPercent*b1} money`);
	assert.equal(i.Bonus2Balance.toNumber()/money, bonusesSpendPercent*b2, `Bonus2 balance should be ${bonusesSpendPercent*b2} money`);
	assert.equal(i.Bonus3Balance.toNumber()/money, bonusesSpendPercent*b3, `Bonus3 balance should be ${bonusesSpendPercent*b3} money`);

	assert.equal(i.Reserve3Balance.toNumber()/money, fundsPercent*reserve, `Reserve3 balance should be ${fundsPercent*reserve} money`);
	assert.equal(i.Dividends3Balance.toNumber()/money, fundsPercent*dividends, `Dividends3 balance should be ${fundsPercent*dividends} money`);
}

async function splitterBalancesAsserts(i, money, allOutpultsBalance, spendsBalance, salariesBalance, otherBalance, tasksBalance, bonusesBalance, restBalance){
	assert.equal(i.AllOutpultsBalance.toNumber()/money, allOutpultsBalance, `AllOutpults balance should be ${allOutpultsBalance} money`);
	assert.equal(i.SpendsBalance.toNumber()/money, spendsBalance, `Spends balance should be ${spendsBalance} money`);
	assert.equal(i.SalariesBalance.toNumber()/money, salariesBalance, `Salaries balance should be ${salariesBalance} money`);
	assert.equal(i.OtherBalance.toNumber()/money, otherBalance, `Other balance should be ${otherBalance} money`);
	assert.equal(i.TasksBalance.toNumber()/money, tasksBalance, `Tasks balance should be ${tasksBalance} money`);
	assert.equal(i.BonusesBalance.toNumber()/money, bonusesBalance, `Bonuses balance should be ${bonusesBalance} money`);
	assert.equal(i.RestBalance.toNumber()/money, restBalance, `Rest balance should be ${restBalance} money`);
}

contract('Moneyflow', (accounts) => {
	let token;
	let store;
	let daoBase;
	let moneyflowInstance;

	let issueTokens;
	let manageGroups;
	let addNewProposal;
	let upgradeDaoContract;
	let addNewTask;
	let startTask;
	let startBounty;
	let modifyMoneyscheme;
	let withdrawDonations;
	let setRootWeiReceiver;
	let burnTokens;
	
	let money = web3.toWei(0.001, "ether");

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async() => {

		token = await StdDaoToken.new("StdToken","STDT",18, true, true, true, 1000000000000000000000000000);

		await token.mint(creator, 1000);

		store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBase.new(store.address,{from: creator});
		
		
		issueTokens = await daoBase.ISSUE_TOKENS();
		
		manageGroups = await daoBase.MANAGE_GROUPS();
		
		upgradeDaoContract = await daoBase.UPGRADE_DAO_CONTRACT();

		addNewProposal = await daoBase.ADD_NEW_PROPOSAL();
		
		burnTokens = await daoBase.BURN_TOKENS();

		moneyflowInstance = await MoneyFlow.new(daoBase.address);

		withdrawDonations = await moneyflowInstance.WITHDRAW_DONATIONS();

		setRootWeiReceiver = await moneyflowInstance.SET_ROOT_WEI_RECEIVER();

		// add creator as first employee
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(manageGroups,creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// manually setup the Default organization 
		await daoBase.allowActionByAnyMemberOfGroup(addNewProposal,"Employees");
		await daoBase.allowActionByAnyMemberOfGroup(setRootWeiReceiver,"Employees");
	
		// this is a list of actions that require voting
		await daoBase.allowActionByVoting(manageGroups, token.address);
		await daoBase.allowActionByVoting(issueTokens, token.address);

		await daoBase.allowActionByAddress(withdrawDonations, creator);

		// moneyflow will not create Proposals in this case 
		//await daoBase.allowActionByAddress("addNewProposal", moneyflowInstance.address);
	});

	it('should process money with WeiAbsoluteExpenseWithPeriod, then 25 hours, then money needs again',async() => {
		const CURRENT_INPUT = 30900;
		let timePeriod = 25;
		let callParams = {from:creator, gasPrice:0}
		let struct = {};
		let balance0 = await web3.eth.getBalance(creator);

		Employee1 = await WeiAbsoluteExpenseWithPeriod.new(1000*money, timePeriod, true, callParams);

		await Employee1.processFunds(1000*money, {value:1000*money, from:outsider, gasPrice:0});
		await CheckExceptions.checkContractThrows(Employee1.flush, [{from:outsider}])
		await Employee1.flush({from:creator, gasPrice:0});

		let balance = await web3.eth.getBalance(creator);
		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*money, 'Should get money');

		let needsEmployee1 = await Employee1.isNeedsMoney({from:creator});
		assert.equal(needsEmployee1, false, 'Dont need money, because he got it');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 25 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		// let periodHours = await Employee1.periodHours();
		// let MomentReceived2 = await Employee1.momentReceived();
		let NOW2 = await Employee1.getNow();

		// assert.equal ( Math.round((NOW2.toNumber() - MomentReceived2.toNumber())/(3600*1000)), 25 )

		let needsEmployee2 = await Employee1.isNeedsMoney({from:creator});
		assert.equal(needsEmployee2, true, 'Need money, because 24 hours passed');

		await Employee1.processFunds(1000*money, {value:1000*money, from:outsider, gasPrice:0});
		await Employee1.flush({from:creator, gasPrice:0});

		let balance2 = await web3.eth.getBalance(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 2000*money, 'Should get money');

		let needsEmployee3 = await Employee1.isNeedsMoney({from:creator});
		assert.equal(needsEmployee3, false, 'Dont need money, because he got it');
	});

	it('should process money with WeiAbsoluteExpenseWithPeriod, then 75 hours, then money needs again x3',async() => {
		let timePeriod = 25;
		let callParams = {from:creator, gasPrice:0}
		let struct = {};
		let balance0 = await web3.eth.getBalance(creator);
		Employee1 = await WeiAbsoluteExpenseWithPeriod.new(1000*money, timePeriod, true, callParams);

		let multi1 = await Employee1.getDebtMultiplier();
		assert.equal(multi1.toNumber(), 1, '0 hours => x1');

		await Employee1.processFunds(1000*money, {value:1000*money, from:outsider, gasPrice:0});
		
		await CheckExceptions.checkContractThrows(Employee1.flush, [{from:outsider}])
		
		await Employee1.flush({from:creator, gasPrice:0});
		
		let balance = await web3.eth.getBalance(creator);

		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*money, 'Should get money');

		let needsEmployee1 = await Employee1.isNeedsMoney({from:creator});
		assert.equal(needsEmployee1, false, 'Dont need money, because he got it');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 75 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		// let periodHours = await Employee1.periodHours();
		// let MomentReceived2 = await Employee1.momentReceived();
		let NOW2 = await Employee1.getNow();

		let multi2 = await Employee1.getDebtMultiplier();
		assert.equal(multi2.toNumber(), 3, '75 hours => x3');

		let needsEmployee2 = await Employee1.isNeedsMoney({from:creator});
		assert.equal(needsEmployee2, true, 'Need money, because 24 hours passed');


		await CheckExceptions.checkContractThrows(Employee1.processFunds, [4000*money, {value:4000*money, from:outsider, gasPrice:0}])
		await CheckExceptions.checkContractThrows(Employee1.processFunds, [2000*money, {value:2000*money, from:outsider, gasPrice:0}])

		await Employee1.processFunds(3000*money, {value:3000*money, from:outsider, gasPrice:0});
		await Employee1.flush({from:creator, gasPrice:0});

		let balance2 = await web3.eth.getBalance(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 4000*money, 'Should get money');

		let needsEmployee3 = await Employee1.isNeedsMoney({from:creator});
		assert.equal(needsEmployee3, false, 'Dont need money, because he got it');
	});

	it('Splitter should access money then close then not accept',async() => {
		let callParams = {from:creator, gasPrice:0}
		let struct = {};
		let balance0 = await web3.eth.getBalance(creator);

		let tax = await WeiRelativeExpenseWithPeriod.new(1000, 0, false, callParams);

		Splitter = await WeiTopDownSplitter.new('SimpleSplitter', callParams);
		await Splitter.addChild(tax.address, callParams);

		let need1 = await Splitter.isNeedsMoney({from:creator});
		let totalNeed1 = await Splitter.getTotalWeiNeeded(1000*money);
		assert.equal(need1, true, 'should need money');
		assert.equal(totalNeed1.toNumber(), 100*money, 'should be 10% of 1000 money');

		await Splitter.processFunds(1000*money, {value:100*money, from:outsider, gasPrice:0});

		let taxBalance = await web3.eth.getBalance(tax.address);
		assert.equal(taxBalance.toNumber(), 100*money, 'Tax receiver should get 100 money');

		let need2 = await Splitter.isNeedsMoney({from:creator});
		let totalNeed2 = await Splitter.getTotalWeiNeeded(1000*money);
		assert.equal(need2, true, 'should need money');
		assert.equal(totalNeed2.toNumber(), 100*money, 'should be 10% of 1000 money');

		await Splitter.close(callParams);

		let need3 = await Splitter.isNeedsMoney({from:creator});
		let totalNeed3 = await Splitter.getTotalWeiNeeded(1000*money);
		assert.equal(need3, false, 'should not need money');
		assert.equal(totalNeed3.toNumber(), 0, 'should be 0 money');

		await CheckExceptions.checkContractThrows(Splitter.processFunds, [100*money, {value:100*money, from:outsider, gasPrice:0}])
	});

	it('should allow to send revenue',async() => {
		// Moneyflow.getRevenueEndpoint() -> Fund
		const revEndpoint = await moneyflowInstance.getRevenueEndpoint();
		assert.equal(revEndpoint,0x0,'Endpoint should be zero');

		const isEnableFlushTo = true;
		let fund = await WeiFund.new(creator,isEnableFlushTo,10000);
		await moneyflowInstance.setRootWeiReceiver(fund.address);

		const revEndpoint2 = await moneyflowInstance.getRevenueEndpoint();
		assert.equal(revEndpoint2,fund.address,'Endpoint should be non zero now');

		// now send some money to the revenue endpoint 
		await fund.processFunds(money, { from: creator, value: money});

		// money should end up in the fund
		let fundBalance = await web3.eth.getBalance(fund.address);
		assert.equal(fundBalance,1000000000000000,'Money should be transferred to the fund');

		let firstCreatorBalance = await web3.eth.getBalance(creator);
		await fund.flush({from:creator, gasPrice:0});

		let secondCreatorBalance = await web3.eth.getBalance(creator);
		let creatorBalanceDelta = secondCreatorBalance.toNumber() - firstCreatorBalance.toNumber();
		assert.equal(creatorBalanceDelta, money, 'creator gets all money by flush();');

		let fundBalance2 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta = fundBalance.toNumber() - fundBalance2.toNumber();
		assert.equal(fundBalanceDelta, money, 'fund have given all money to creator by flush();');

		const isNeeds = await fund.isNeedsMoney();
		assert.isTrue(isNeeds,'Fund should ask for more money always!');

		// TODO: should be revenueEndpoint address instead
		await fund.processFunds(money, { from: creator, value: money});

		// test fund.flushTo();
		let fundBalance3 = await web3.eth.getBalance(fund.address);
		assert.equal(fundBalance,money,'Money should be transferred to the fund');

		let firstOutsiderBalance = await web3.eth.getBalance(outsider);
		await fund.flushTo(outsider, {from:creator, gasPrice:0});
		let secondOutsiderBalance = await web3.eth.getBalance(outsider);
		let outsiderBalanceDelta = secondOutsiderBalance.toNumber() - firstOutsiderBalance.toNumber();
		assert.equal(outsiderBalanceDelta, money, 'outsider gets all money by flushTo();');

		let fundBalance4 = await web3.eth.getBalance(fund.address);
		let fundBalanceDelta2 = fundBalance3.toNumber() - fundBalance4.toNumber();
		assert.equal(fundBalanceDelta2, money, 'fund have given all money to creator by flushTo();');
	});

	it('should allow to get donations',async() => {
		const isEnableFlushTo = true;
		let fund = await WeiFund.new(creator,isEnableFlushTo,10000);

		///
		const dea = await moneyflowInstance.getDonationEndpoint(); 
		assert.notEqual(dea,0x0, 'donation endpoint should be created');
		const donationEndpoint = await IWeiReceiver.at(dea);
		await donationEndpoint.processFunds(money, { from: creator, value: money});

		let donationBalance = await web3.eth.getBalance(donationEndpoint.address);
		assert.equal(donationBalance.toNumber(),money, 'all money at donation point now');

		// this should not work, because creator is NOT a IWeiReceiver
		await CheckExceptions.checkContractThrows(moneyflowInstance.setRootWeiReceiver, 
			[creator, { value:1000*money, from: creator}]
		);

		// get the donations 
		let outsiderBalance = await web3.eth.getBalance(outsider);

		await moneyflowInstance.withdrawDonationsTo(outsider,{ from:creator });
		let donationBalance2 = await web3.eth.getBalance(donationEndpoint.address);
		assert.equal(donationBalance2.toNumber(),0, 'all donations now on creator`s balance');

		let outsiderBalance2 = await web3.eth.getBalance(outsider);
		let creatorBalanceDelta = outsiderBalance2.toNumber() - outsiderBalance.toNumber();
		assert.equal(creatorBalanceDelta, money, 'all donations is transferred now');
	});

	it('should process money with WeiTopDownSplitter + 3 WeiAbsoluteExpense',async() => {
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

		let revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, weiTopDownSplitter.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint 
		await weiTopDownSplitter.processFunds(6*money, {value:6*money, from:creator});

		// money should end up in the outputs
		let weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(),1*money, 'resource point received money from splitter');

		let weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		assert.equal(weiAbsoluteExpense2Balance.toNumber(),2*money, 'resource point received money from splitter');

		let weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(),3*money, 'resource point received money from splitter');
	});

	it('should process money with WeiUnsortedSplitter + 3 WeiAbsoluteExpense',async() => {
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

		let revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, weiUnsortedSplitter.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint 
		await weiUnsortedSplitter.processFunds(6*money, {value:6*money, from:creator});

		// money should end up in the outputs
		let weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(),1*money, 'resource point received money from splitter');

		let weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		assert.equal(weiAbsoluteExpense2Balance.toNumber(),2*money, 'resource point received money from splitter');

		let weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(),3*money, 'resource point received money from splitter');
	});

	it('should process money in structure o-> o-> o-o-o',async() => {
		let AllOutpults = await WeiTopDownSplitter.new('AllOutpults', {from:creator, gasPrice:0});
		let Salaries = await WeiUnsortedSplitter.new('Salaries', {from:creator, gasPrice:0});

		let Employee1 = await WeiAbsoluteExpense.new(1000*money, {from:creator, gasPrice:0});
		let Employee2 = await WeiAbsoluteExpense.new(1500*money, {from:creator, gasPrice:0});
		let Employee3 = await WeiAbsoluteExpense.new(800*money, {from:creator, gasPrice:0});

		await AllOutpults.addChild(Salaries.address, {from:creator, gasPrice:0});

		await Salaries.addChild(Employee1.address, {from:creator, gasPrice:0});
		await Salaries.addChild(Employee2.address, {from:creator, gasPrice:0});
		await Salaries.addChild(Employee3.address, {from:creator, gasPrice:0});

		let Employee1Needs = await Employee1.getTotalWeiNeeded(3300*money);
			assert.equal(Employee1Needs.toNumber()/money, 1000, 'Employee1 Needs 1000 money' );
		let Employee2Needs = await Employee2.getTotalWeiNeeded(3300*money);
			assert.equal(Employee2Needs.toNumber()/money, 1500, 'Employee1 Needs 1500 money' );
		let Employee3Needs = await Employee3.getTotalWeiNeeded(3300*money);
			assert.equal(Employee3Needs.toNumber()/money, 800, 'Employee1 Needs 800 money' );

		let SalariesNeeds = await Salaries.getTotalWeiNeeded(3300*money);
			assert.equal(SalariesNeeds.toNumber()/money, 3300, 'Salaries Needs 3300 money' );

		let SalariesMinNeeds = await Salaries.getMinWeiNeeded();
			assert.equal(SalariesNeeds.toNumber()/money, 3300, 'Salaries min Needs 3300 money' );

		let AllOutpultsNeeds = await AllOutpults.getTotalWeiNeeded(3300*money);
			assert.equal(AllOutpultsNeeds.toNumber()/money, 3300, 'AllOutpults Needs 3300 money' );
		let MinOutpultsNeeds = await AllOutpults.getMinWeiNeeded();
			assert.equal(AllOutpultsNeeds.toNumber()/money, 3300, 'AllOutpults Needs min 3300 money' );
		let OutputChildrenCount = await AllOutpults.getChildrenCount();
			assert.equal(OutputChildrenCount.toNumber(), 1, 'OutputChildrenCount should be 1');
		let SalariesChildrenCount = await Salaries.getChildrenCount();
			assert.equal(SalariesChildrenCount.toNumber(), 3, 'SalariesChildrenCount should be 3');

		let th = await Salaries.processFunds(3300*money, {value:3300*money, from:creator, gasPrice:0});
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ',async() => {
		const CURRENT_INPUT = 30900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 100;
		let b2 = 100;
		let b3 = 200;
		let reserve = 7500;
		let dividends = 2500;

		let struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);

		let splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);

		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, from:creator, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);

	});

	it('should process money with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed',async() => {
		const CURRENT_INPUT = 5900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 100;
		let b2 = 100;
		let b3 = 200;
		let reserve = 7500;
		let dividends = 2500;

		let struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);

		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, from:creator, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed',async() => {
		const CURRENT_INPUT = 5900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 100;
		let b2 = 100;
		let b3 = 200;
		let reserve = 7500;
		let dividends = 2500;

		let struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await CheckExceptions.checkContractThrows(struct.AllOutpults.processFunds, 
			[1000*money, { value:1000*money, from: creator }]
		);

		await CheckExceptions.checkContractThrows(struct.AllOutpults.processFunds, 
			[100000*money, { value:1000*money, from: creator }]
		);

		await CheckExceptions.checkContractThrows(struct.AllOutpults.processFunds, 
			[1000*money, { value:100000*money, from: creator }]
		);
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ',async() => {
		const CURRENT_INPUT = 20900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 100;
		let b2 = 100;
		let b3 = 200;
		let reserve = 1000;
		let dividends = 1500;

		let struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, from:creator, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await splitterBalancesAsserts(balances, money, 10800, 0, 0, 0, 0, 0, 0);
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ',async() => {
		const CURRENT_INPUT = 5900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 100;
		let b2 = 100;
		let b3 = 200;
		let reserve = 1000;
		let dividends = 1500;

		let struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, from:creator, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed; ',async() => {
		const CURRENT_INPUT = 30900;
		let e1 = 1000;
		let e2 = 1500; 
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 100;
		let b2 = 100;
		let b3 = 200;
		let reserve = 1000;
		let dividends = 1500;

		let struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await CheckExceptions.checkContractThrows(struct.AllOutpults.processFunds, 
			[1000*money, { value:1000*money, from: creator }]
		);

		await CheckExceptions.checkContractThrows(struct.AllOutpults.processFunds, 
			[100000*money, { value:1000*money, from: creator }]
		);

		await CheckExceptions.checkContractThrows(struct.AllOutpults.processFunds, 
			[1000*money, { value:100000*money, from: creator }]
		);
	});

});
