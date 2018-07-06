var MoneyflowTable = artifacts.require("./MoneyflowTable");

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

var getEId=o=> o.logs.filter(l => l.event == 'elementAdded')[0].args._eId.toNumber();

function KECCAK256 (x){
	return web3.sha3(x);
}

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function KECCAK256 (x){
	return web3.sha3(x);
}

/*async function createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	var callParams = {from:creator, gasPrice:0}
	var o = {};

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
	var totalSpend = e1+e2+e3 + t1+t2+t3 + office+internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend)/10000;
	var fundsPercent = (CURRENT_INPUT-totalSpend-bonusesSpendPercent*(b1+b2+b3))/10000;

	var allNeeds = totalSpend + bonusesSpendPercent*(b1+b2+b3) + fundsPercent*(reserve+dividends);

	global.assert.equal(i.AllOutpultsTotalNeed.toNumber()/money, allNeeds, `AllOutpults Total Need should be ${allNeeds}`);
	global.assert.equal(i.AllOutpultsMinNeed.toNumber()/money, totalSpend, `AllOutpults min Need should be ${totalSpend}`);
	global.assert.equal(i.SpendsTotalNeed.toNumber()/money, totalSpend, `Spends Total Need should be ${totalSpend}`);
	global.assert.equal(i.SpendsMinNeed.toNumber()/money, totalSpend, `Spends min Need should be ${totalSpend}`);
	global.assert.equal(i.SalariesTotalNeed.toNumber()/money, e1+e2+e3, `Salaries Total Need should be ${e1+e2+e3}`);
	global.assert.equal(i.SalariesMinNeed.toNumber()/money, e1+e2+e3, `Salaries min Need should be ${e1+e2+e3}`);
	global.assert.equal(i.OtherTotalNeed.toNumber()/money, office+internet, `Other Total Need should be ${office+internet}`);
	global.assert.equal(i.OtherMinNeed.toNumber()/money, office+internet, `Other min Need should be ${office+internet}`);
	global.assert.equal(i.TasksTotalNeed.toNumber()/money, t1+t2+t3, `Tasks Total Need should be ${t1+t2+t3}`);
	global.assert.equal(i.TasksMinNeed.toNumber()/money, t1+t2+t3, `Tasks min Need should be ${t1+t2+t3}`);
	global.assert.equal(i.BonusesTotalNeed.toNumber()/money, (b1+b2+b3)*CURRENT_INPUT/10000, `Bonuses Total Need should be ${(b1+b2+b3)*CURRENT_INPUT/10000}`);
	global.assert.equal(i.BonusesMinNeed.toNumber()/money, 0, `Bonuses min Need should be ${0}`);
	global.assert.equal(i.RestTotalNeed.toNumber()/money, (reserve+dividends)*CURRENT_INPUT/10000, `Rest Total Need should be ${(reserve+dividends)*CURRENT_INPUT/10000}`);
	global.assert.equal(i.RestMinNeed.toNumber()/money, 0, `Rest min Need should be ${0}`);
}


async function getBalances(i){
	var o = {};
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
	var o = {}
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
	global.assert.equal(i.AllOutpultsChildrenCount.toNumber(), 3, 'Children count should be 3');
	global.assert.equal(i.SpendsChildrenCount.toNumber(), 3, 'Children count should be 3');
	global.assert.equal(i.SalariesChildrenCount.toNumber(), 3, 'Children count should be 3');
	global.assert.equal(i.OtherChildrenCount.toNumber(), 2, 'Children count should be 2');
	global.assert.equal(i.TasksChildrenCount.toNumber(), 3, 'Children count should be 3');
	global.assert.equal(i.BonusesChildrenCount.toNumber(), 3, 'Children count should be 3');
	global.assert.equal(i.RestChildrenCount.toNumber(), 2, 'Children count should be 2');
}

async function balancesAsserts(i, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	var totalSpend = e1+e2+e3 + t1+t2+t3 + office+internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend)/10000;
	var fundsPercent = (CURRENT_INPUT-totalSpend-bonusesSpendPercent*(b1+b2+b3))/10000;

	global.assert.equal(i.Employee1Balance.toNumber()/money, e1, `Employee1 balance should be ${e1} money`);
	global.assert.equal(i.Employee2Balance.toNumber()/money, e2, `Employee2 balance should be ${e2} money`);
	global.assert.equal(i.Employee3Balance.toNumber()/money, e3, `Employee3 balance should be ${e3} money`);
	global.assert.equal(i.OfficeBalance.toNumber()/money, office, `Office balance should be ${office} money`);
	global.assert.equal(i.InternetBalance.toNumber()/money, internet, `Internet balance should be ${internet} money`);
	global.assert.equal(i.Task1Balance.toNumber()/money, t1, `Task1 balance should be ${t1} money`);
	global.assert.equal(i.Task2Balance.toNumber()/money, t2, `Task2 balance should be ${t2} money`);
	global.assert.equal(i.Task3Balance.toNumber()/money, t3, `Task3 balance should be ${t3} money`);

	global.assert.equal(i.Bonus1Balance.toNumber()/money, bonusesSpendPercent*b1, `Bonus1 balance should be ${bonusesSpendPercent*b1} money`);
	global.assert.equal(i.Bonus2Balance.toNumber()/money, bonusesSpendPercent*b2, `Bonus2 balance should be ${bonusesSpendPercent*b2} money`);
	global.assert.equal(i.Bonus3Balance.toNumber()/money, bonusesSpendPercent*b3, `Bonus3 balance should be ${bonusesSpendPercent*b3} money`);

	global.assert.equal(i.Reserve3Balance.toNumber()/money, fundsPercent*reserve, `Reserve3 balance should be ${fundsPercent*reserve} money`);
	global.assert.equal(i.Dividends3Balance.toNumber()/money, fundsPercent*dividends, `Dividends3 balance should be ${fundsPercent*dividends} money`);
}

async function splitterBalancesAsserts(i, money, allOutpultsBalance, spendsBalance, salariesBalance, otherBalance, tasksBalance, bonusesBalance, restBalance){
	global.assert.equal(i.AllOutpultsBalance.toNumber()/money, allOutpultsBalance, `AllOutpults balance should be ${allOutpultsBalance} money`);
	global.assert.equal(i.SpendsBalance.toNumber()/money, spendsBalance, `Spends balance should be ${spendsBalance} money`);
	global.assert.equal(i.SalariesBalance.toNumber()/money, salariesBalance, `Salaries balance should be ${salariesBalance} money`);
	global.assert.equal(i.OtherBalance.toNumber()/money, otherBalance, `Other balance should be ${otherBalance} money`);
	global.assert.equal(i.TasksBalance.toNumber()/money, tasksBalance, `Tasks balance should be ${tasksBalance} money`);
	global.assert.equal(i.BonusesBalance.toNumber()/money, bonusesBalance, `Bonuses balance should be ${bonusesBalance} money`);
	global.assert.equal(i.RestBalance.toNumber()/money, restBalance, `Rest balance should be ${restBalance} money`);
}*/

global.contract('MoneyflowTable tests', (accounts) => {
	var token;
	var store;
	var daoBase;
	var moneyflowInstance;

	var money = web3.toWei(0.001, "ether");

	var neededAmount = 1e15;
	var isPeriodic = false;
	var isAccumulateDebt = false;
	var periodHours = 0;
	var output = '0x0';	

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});
		daoBase = await DaoBase.new(store.address,{gas: 10000000, from: creator});

		// add creator as first employee
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// manually setup the Default organization 
		await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("setRootWeiReceiver","Employees");

		await daoBase.allowActionByAnyMemberOfGroup("openGate","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("closeGate","Employees");

		// this is a list of actions that require voting
		await daoBase.allowActionByVoting("manageGroups", token.address);
		await daoBase.allowActionByVoting("addNewTask", token.address);
		await daoBase.allowActionByVoting("issueTokens", token.address);

		await daoBase.allowActionByAddress("withdrawDonations", creator);
		moneyflowInstance = await MoneyFlow.new(daoBase.address,{from: creator});
	});

	global.it('Gas measurements',async() => {
		var b1 = web3.eth.getBalance(creator);
		let moneyflowTable = await MoneyflowTable.new({gasPrice:1});
		var b2 = web3.eth.getBalance(creator);
		await moneyflowTable.addTopdownSplitter({gasPrice:1});
		var b3 = web3.eth.getBalance(creator);
		await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output, {gasPrice:1});
		var b4 = web3.eth.getBalance(creator);

		console.log('moneyflowTable:', b1.toNumber() - b2.toNumber());
		console.log('splitter:', b2.toNumber() - b3.toNumber());
		console.log('expense:', b3.toNumber() - b4.toNumber());

	});

	// 0->•abs
	global.it('should process money with WeiTopDownSplitter + 3 WeiAbsoluteExpense',async() => {
		let moneyflowTable = await MoneyflowTable.new();

		let topDownSplitterId = getEId(await moneyflowTable.addTopdownSplitter());			
		let AbsoluteExpense1Id = getEId(await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));
		let AbsoluteExpense2Id = getEId(await moneyflowTable.addAbsoluteExpense(2*neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));
		let AbsoluteExpense3Id = getEId(await moneyflowTable.addAbsoluteExpense(3*neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await moneyflowTable.addChild(topDownSplitterId, AbsoluteExpense1Id);
		await moneyflowTable.addChild(topDownSplitterId, AbsoluteExpense2Id);
		await moneyflowTable.addChild(topDownSplitterId, AbsoluteExpense3Id);

		// add WeiTopDownSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(moneyflowTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		global.assert.equal(revenueEndpointAddress, moneyflowTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
	 	let totalNeed = await moneyflowTable.getTotalWeiNeeded(6*neededAmount);
		global.assert.equal(totalNeed, 6*neededAmount);
		let minNeed = await moneyflowTable.getMinWeiNeeded();
		// console.log('minNeed:', minNeed)
		global.assert.equal(minNeed, 6*neededAmount);

		// now send some money to the revenue endpoint 
		await moneyflowTable.processFunds(6*neededAmount, {value:6*neededAmount, from:creator});

		// money should end up in the outputs
		var absoluteExpense1Balance = await moneyflowTable.getElementBalance(AbsoluteExpense1Id);
		global.assert.equal(absoluteExpense1Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await moneyflowTable.getElementBalance(AbsoluteExpense2Id);
		global.assert.equal(absoluteExpense2Balance.toNumber(),2*neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await moneyflowTable.getElementBalance(AbsoluteExpense3Id);
		global.assert.equal(absoluteExpense3Balance.toNumber(),3*neededAmount, 'resource point received money from splitter');
		// global.assert.equal(true,false);
	});

	global.it('should process money with WeiUnsortedSplitter + 3 WeiAbsoluteExpense',async() => {
		let moneyflowTable = await MoneyflowTable.new();
		
		let unsortedSplitterId = getEId(await moneyflowTable.addUnsortedSplitter());	
		let AbsoluteExpense1Id = getEId(await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));
		let AbsoluteExpense2Id = getEId(await moneyflowTable.addAbsoluteExpense(2*neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));
		let AbsoluteExpense3Id = getEId(await moneyflowTable.addAbsoluteExpense(3*neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));

		await moneyflowTable.addChild(unsortedSplitterId, AbsoluteExpense1Id);
		await moneyflowTable.addChild(unsortedSplitterId, AbsoluteExpense2Id);
		await moneyflowTable.addChild(unsortedSplitterId, AbsoluteExpense3Id);

		// add WeiTopDownSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(moneyflowTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		global.assert.equal(revenueEndpointAddress, moneyflowTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint 
		let totalNeed = await moneyflowTable.getTotalWeiNeeded(6*neededAmount);
		global.assert.equal(totalNeed, 6*neededAmount);
		let minNeed = await moneyflowTable.getMinWeiNeeded();
		global.assert.equal(minNeed, 6*neededAmount);	

		await moneyflowTable.processFunds(6*neededAmount, {value:6*neededAmount, from:creator});
		// money should end up in the outputs
		var absoluteExpense1Balance = await moneyflowTable.getElementBalance(AbsoluteExpense1Id);
		global.assert.equal(absoluteExpense1Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await moneyflowTable.getElementBalance(AbsoluteExpense2Id);
		global.assert.equal(absoluteExpense2Balance.toNumber(),2*neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await moneyflowTable.getElementBalance(AbsoluteExpense3Id);
		global.assert.equal(absoluteExpense3Balance.toNumber(),3*neededAmount, 'resource point received money from splitter');
	});

	/*global.it('should process money in structure o-> o-> o-o-o',async() => {
		let moneyflowTable = await MoneyflowTable.new();
		let unsortedSplitterId  = await moneyflowTable.elementsCount();
		await moneyflowTable.addTopdownSplitter();
		let AbsoluteExpense1Id  = await moneyflowTable.elementsCount();
		await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output);
		let AbsoluteExpense2Id  = await moneyflowTable.elementsCount();
		await moneyflowTable.addAbsoluteExpense(2*neededAmount, isPeriodic, isAccumulateDebt, periodHours, output);
		let AbsoluteExpense3Id  = await moneyflowTable.elementsCount();
		await moneyflowTable.addAbsoluteExpense(3*neededAmount, isPeriodic, isAccumulateDebt, periodHours, output);
	
		var AllOutpults = await WeiTopDownSplitter.new('AllOutpults', {from:creator, gasPrice:0});
		var Salaries = await WeiUnsortedSplitter.new('Salaries', {from:creator, gasPrice:0});

		var Employee1 = await WeiAbsoluteExpense.new(1000*money, {from:creator, gasPrice:0});
		var Employee2 = await WeiAbsoluteExpense.new(1500*money, {from:creator, gasPrice:0});
		var Employee3 = await WeiAbsoluteExpense.new(800*money, {from:creator, gasPrice:0});

		await AllOutpults.addChild(Salaries.address, {from:creator, gas:1000000, gasPrice:0});

		await Salaries.addChild(Employee1.address, {from:creator, gas:1000000, gasPrice:0});
		await Salaries.addChild(Employee2.address, {from:creator, gas:1000000, gasPrice:0});
		await Salaries.addChild(Employee3.address, {from:creator, gas:1000000, gasPrice:0});

		var Employee1Needs = await Employee1.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee1Needs.toNumber()/money, 1000, 'Employee1 Needs 1000 money' );
		var Employee2Needs = await Employee2.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee2Needs.toNumber()/money, 1500, 'Employee1 Needs 1500 money' );
		var Employee3Needs = await Employee3.getTotalWeiNeeded(3300*money);
			global.assert.equal(Employee3Needs.toNumber()/money, 800, 'Employee1 Needs 800 money' );

		var SalariesNeeds = await Salaries.getTotalWeiNeeded(3300*money);
			global.assert.equal(SalariesNeeds.toNumber()/money, 3300, 'Salaries Needs 3300 money' );

		var SalariesMinNeeds = await Salaries.getMinWeiNeeded();
			global.assert.equal(SalariesNeeds.toNumber()/money, 3300, 'Salaries min Needs 3300 money' );

		var AllOutpultsNeeds = await AllOutpults.getTotalWeiNeeded(3300*money);
			global.assert.equal(AllOutpultsNeeds.toNumber()/money, 3300, 'AllOutpults Needs 3300 money' );
		var MinOutpultsNeeds = await AllOutpults.getMinWeiNeeded();
			global.assert.equal(AllOutpultsNeeds.toNumber()/money, 3300, 'AllOutpults Needs min 3300 money' );
		var OutputChildrenCount = await AllOutpults.getChildrenCount();
			global.assert.equal(OutputChildrenCount.toNumber(), 1, 'OutputChildrenCount should be 1');
		var SalariesChildrenCount = await Salaries.getChildrenCount();
			global.assert.equal(SalariesChildrenCount.toNumber(), 3, 'SalariesChildrenCount should be 3');

		var th = await Salaries.processFunds(3300*money, {value:3300*money, from:creator, gas:1000000, gasPrice:0});
	});*/
});
