var MoneyflowTable = artifacts.require("./MoneyflowTable");

var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var CheckExceptions = require('../utils/checkexceptions');

var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var WeiRelativeExpense = artifacts.require("./WeiRelativeExpense");
var WeiAbsoluteExpenseWithPeriod = artifacts.require("./WeiAbsoluteExpenseWithPeriod");
var WeiRelativeExpenseWithPeriod = artifacts.require("./WeiRelativeExpenseWithPeriod");

var getEId=o=> o.logs.filter(l => l.event == 'ElementAdded')[0].args._eId.toNumber();

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

async function createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	var o = {};

	o.moneyflowTable = await MoneyflowTable.new();

	o.AllOutpultsId = getEId(await o.moneyflowTable.addTopdownSplitter());
		o.SpendsId = getEId(await o.moneyflowTable.addUnsortedSplitter());
			o.SalariesId = getEId(await o.moneyflowTable.addUnsortedSplitter());
				o.Employee1Id = getEId(await o.moneyflowTable.addAbsoluteExpense(e1*money, false, false, 0, '0x0'));
				o.Employee2Id = getEId(await o.moneyflowTable.addAbsoluteExpense(e2*money, false, false, 0, '0x0'));
				o.Employee3Id = getEId(await o.moneyflowTable.addAbsoluteExpense(e3*money, false, false, 0, '0x0'));			
			o.OtherId = getEId(await o.moneyflowTable.addUnsortedSplitter());
				o.OfficeId = getEId(await o.moneyflowTable.addAbsoluteExpense(office*money, false, false, 0, '0x0'));
				o.InternetId = getEId(await o.moneyflowTable.addAbsoluteExpense(internet*money, false, false, 0, '0x0'));
			o.TasksId = getEId(await o.moneyflowTable.addUnsortedSplitter());
				o.Task1Id = getEId(await o.moneyflowTable.addAbsoluteExpense(t1*money, false, false, 0, '0x0'));
				o.Task2Id = getEId(await o.moneyflowTable.addAbsoluteExpense(t2*money, false, false, 0, '0x0'));
				o.Task3Id = getEId(await o.moneyflowTable.addAbsoluteExpense(t3*money, false, false, 0, '0x0'));
			o.BonusesId = getEId(await o.moneyflowTable.addUnsortedSplitter());
				o.Bonus1Id = getEId(await o.moneyflowTable.addRelativeExpense(b1, false, false, 0, '0x0'));
				o.Bonus2Id = getEId(await o.moneyflowTable.addRelativeExpense(b2, false, false, 0, '0x0'));
				o.Bonus3Id = getEId(await o.moneyflowTable.addRelativeExpense(b3, false, false, 0, '0x0'));
			o.RestId = getEId(await o.moneyflowTable.addUnsortedSplitter());
				o.DividendsFundId = getEId(await o.moneyflowTable.addRelativeExpense(dividends, true, false, 0, '0x0'));
				o.ReserveFundId = getEId(await o.moneyflowTable.addRelativeExpense(reserve, true, false, 0, '0x0'));

	
	await o.moneyflowTable.addChild(o.AllOutpultsId, o.SpendsId);
		await o.moneyflowTable.addChild(o.SpendsId, o.SalariesId);
			await o.moneyflowTable.addChild(o.SalariesId, o.Employee1Id);
			await o.moneyflowTable.addChild(o.SalariesId, o.Employee2Id);
			await o.moneyflowTable.addChild(o.SalariesId, o.Employee3Id);
		await o.moneyflowTable.addChild(o.SpendsId, o.OtherId);
			await o.moneyflowTable.addChild(o.OtherId, o.OfficeId);
			await o.moneyflowTable.addChild(o.OtherId, o.InternetId);
		await o.moneyflowTable.addChild(o.SpendsId, o.TasksId);
			await o.moneyflowTable.addChild(o.TasksId, o.Task1Id);
			await o.moneyflowTable.addChild(o.TasksId, o.Task2Id);
			await o.moneyflowTable.addChild(o.TasksId, o.Task3Id);
	await o.moneyflowTable.addChild(o.AllOutpultsId, o.BonusesId);
		await o.moneyflowTable.addChild(o.BonusesId, o.Bonus1Id);
		await o.moneyflowTable.addChild(o.BonusesId, o.Bonus2Id);
		await o.moneyflowTable.addChild(o.BonusesId, o.Bonus3Id);
	await o.moneyflowTable.addChild(o.AllOutpultsId, o.RestId);
		await o.moneyflowTable.addChild(o.RestId, o.ReserveFundId);
		await o.moneyflowTable.addChild(o.RestId, o.DividendsFundId);

	return o;
}

async function totalAndMinNeedsAsserts(money, i, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	var totalSpend = e1+e2+e3 + t1+t2+t3 + office+internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend)/10000;
	var fundsPercent = (CURRENT_INPUT-totalSpend-bonusesSpendPercent*(b1+b2+b3))/10000;

	var allNeeds = totalSpend + bonusesSpendPercent*(b1+b2+b3) + fundsPercent*(reserve+dividends);

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
	var o = {};
	o.Employee1Balance = await i.moneyflowTable.getElementBalance(i.Employee1Id);
	o.Employee2Balance = await i.moneyflowTable.getElementBalance(i.Employee2Id);
	o.Employee3Balance = await i.moneyflowTable.getElementBalance(i.Employee3Id);
	o.OfficeBalance = await i.moneyflowTable.getElementBalance(i.OfficeId);
	o.InternetBalance = await i.moneyflowTable.getElementBalance(i.InternetId);
	o.Task1Balance = await i.moneyflowTable.getElementBalance(i.Task1Id);
	o.Task2Balance = await i.moneyflowTable.getElementBalance(i.Task2Id);
	o.Task3Balance = await i.moneyflowTable.getElementBalance(i.Task3Id);
	o.Reserve3Balance = await i.moneyflowTable.getElementBalance(i.ReserveFundId);
	o.Dividends3Balance = await i.moneyflowTable.getElementBalance(i.DividendsFundId);
	o.Bonus1Balance = await i.moneyflowTable.getElementBalance(i.Bonus1Id);
	o.Bonus2Balance = await i.moneyflowTable.getElementBalance(i.Bonus2Id);
	o.Bonus3Balance = await i.moneyflowTable.getElementBalance(i.Bonus3Id);
	o.AllOutpultsBalance = await i.moneyflowTable.getElementBalance(i.AllOutpultsId);
	o.SpendsBalance = await i.moneyflowTable.getElementBalance(i.SpendsId);
	o.SalariesBalance = await i.moneyflowTable.getElementBalance(i.SalariesId);
	o.OtherBalance = await i.moneyflowTable.getElementBalance(i.OtherId);
	o.TasksBalance = await i.moneyflowTable.getElementBalance(i.TasksId);
	o.BonusesBalance = await i.moneyflowTable.getElementBalance(i.BonusesId);
	o.RestBalance = await i.moneyflowTable.getElementBalance(i.RestId);

	return o;
}

async function getSplitterParams(money, i, CURRENT_INPUT){
	var o = {}
	o.AllOutpultsTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.AllOutpultsId, CURRENT_INPUT*money);
	o.AllOutpultsMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.AllOutpultsId);
	o.AllOutpultsChildrenCount = await i.moneyflowTable.getChildrenCount(i.AllOutpultsId);
	o.SpendsTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.SpendsId, CURRENT_INPUT*money);
	o.SpendsMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.SpendsId);
	o.SpendsChildrenCount = await i.moneyflowTable.getChildrenCount(i.SpendsId);
	o.SalariesTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.SalariesId, CURRENT_INPUT*money);
	o.SalariesMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.SalariesId);
	o.SalariesChildrenCount = await i.moneyflowTable.getChildrenCount(i.SalariesId);
	o.OtherTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.OtherId, CURRENT_INPUT*money);
	o.OtherMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.OtherId);
	o.OtherChildrenCount = await i.moneyflowTable.getChildrenCount(i.OtherId);
	o.TasksTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.TasksId, CURRENT_INPUT*money);
	o.TasksMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.TasksId);
	o.TasksChildrenCount = await i.moneyflowTable.getChildrenCount(i.TasksId);
	o.BonusesTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.BonusesId, CURRENT_INPUT*money);
	o.BonusesMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.BonusesId);
	o.BonusesChildrenCount = await i.moneyflowTable.getChildrenCount(i.BonusesId);
	o.RestTotalNeed = await i.moneyflowTable.getTotalWeiNeededForElement(i.RestId, CURRENT_INPUT*money);
	o.RestMinNeed = await i.moneyflowTable.getMinWeiNeededForElement(i.RestId);
	o.RestChildrenCount = await i.moneyflowTable.getChildrenCount(i.RestId);

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

async function balancesAsserts(money, i, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends){
	var totalSpend = e1+e2+e3 + t1+t2+t3 + office+internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend)/10000;
	var fundsPercent = (CURRENT_INPUT-totalSpend-bonusesSpendPercent*(b1+b2+b3))/10000;

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

contract('MoneyflowTable tests', (accounts) => {
	var token;
	var store;
	var daoBase;
	var moneyflowInstance;

	var neededAmount = 1e15;
	var isPeriodic = false;
	var isAccumulateDebt = false;
	var periodHours = 0;
	var output = '0x0';	

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000000000000000000000);

		await token.mint(creator, 1000, {gasPrice: 0});

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
	});

	it('Gas measurements',async() => {
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
	it('should process money with WeiTopDownSplitter + 3 WeiAbsoluteExpense',async() => {
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

		assert.equal(revenueEndpointAddress, moneyflowTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
	 	let totalNeed = await moneyflowTable.getTotalWeiNeeded(6*neededAmount);
		assert.equal(totalNeed, 6*neededAmount);
		let minNeed = await moneyflowTable.getMinWeiNeeded();
		// console.log('minNeed:', minNeed)
		assert.equal(minNeed, 6*neededAmount);

		// now send some money to the revenue endpoint 
		await moneyflowTable.processFunds(6*neededAmount, {value:6*neededAmount, from:creator});

		// money should end up in the outputs
		var absoluteExpense1Balance = await moneyflowTable.getElementBalance(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await moneyflowTable.getElementBalance(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(),2*neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await moneyflowTable.getElementBalance(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(),3*neededAmount, 'resource point received money from splitter');
	});

	it('should process money with WeiUnsortedSplitter + 3 WeiAbsoluteExpense',async() => {
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

		assert.equal(revenueEndpointAddress, moneyflowTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint 
		let totalNeed = await moneyflowTable.getTotalWeiNeeded(6*neededAmount);
		assert.equal(totalNeed, 6*neededAmount);
		let minNeed = await moneyflowTable.getMinWeiNeeded();
		assert.equal(minNeed, 6*neededAmount);	

		await moneyflowTable.processFunds(6*neededAmount, {value:6*neededAmount, from:creator});
		// money should end up in the outputs
		var absoluteExpense1Balance = await moneyflowTable.getElementBalance(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await moneyflowTable.getElementBalance(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(),2*neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await moneyflowTable.getElementBalance(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(),3*neededAmount, 'resource point received money from splitter');
	});


	it('should process money with WeiTopDownSplitter + 2 WeiAbsoluteExpense + WeiRelativeExpense',async() => {
		let moneyflowTable = await MoneyflowTable.new();

		let topDownSplitterId = getEId(await moneyflowTable.addTopdownSplitter());			
		let AbsoluteExpense1Id = getEId(await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));
		let RelativeExpense1Id = getEId(await moneyflowTable.addRelativeExpense(5000, isPeriodic, isAccumulateDebt, periodHours, output));
		let AbsoluteExpense3Id = getEId(await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await moneyflowTable.addChild(topDownSplitterId, AbsoluteExpense1Id);
		await moneyflowTable.addChild(topDownSplitterId, RelativeExpense1Id);
		await moneyflowTable.addChild(topDownSplitterId, AbsoluteExpense3Id);

		// add WeiTopDownSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(moneyflowTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, moneyflowTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
	 	let totalNeed = await moneyflowTable.getTotalWeiNeeded(3*neededAmount);
		assert.equal(totalNeed.toNumber(), 3*neededAmount);
		let minNeed = await moneyflowTable.getMinWeiNeeded();
		assert.equal(minNeed.toNumber(), 3*neededAmount);

		// now send some money to the revenue endpoint 
		await moneyflowTable.processFunds(3*neededAmount, {value:3*neededAmount, from:creator});

		// money should end up in the outputs
		var absoluteExpense1Balance = await moneyflowTable.getElementBalance(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var relativeExpense2Balance = await moneyflowTable.getElementBalance(RelativeExpense1Id);
		assert.equal(relativeExpense2Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await moneyflowTable.getElementBalance(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');
	});

  it('should process money with WeiUnsortedSplitter + 2 WeiAbsoluteExpense + WeiRelativeExpense',async() => {
		let moneyflowTable = await MoneyflowTable.new();

		let SplitterId = getEId(await moneyflowTable.addUnsortedSplitter());			
		let AbsoluteExpense1Id = getEId(await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));
		let RelativeExpense1Id = getEId(await moneyflowTable.addRelativeExpense(9000, isPeriodic, isAccumulateDebt, periodHours, output));
		let AbsoluteExpense3Id = getEId(await moneyflowTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours, output));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await moneyflowTable.addChild(SplitterId, AbsoluteExpense1Id);
		await moneyflowTable.addChild(SplitterId, RelativeExpense1Id);
		await moneyflowTable.addChild(SplitterId, AbsoluteExpense3Id);

		// add WeiSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(moneyflowTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		global.assert.equal(revenueEndpointAddress, moneyflowTable.address, 'weiSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
	 	let totalNeed = await moneyflowTable.getTotalWeiNeeded(20*neededAmount);
		global.assert.equal(totalNeed.toNumber(), 20*neededAmount);
		let minNeed = await moneyflowTable.getMinWeiNeeded();
		global.assert.equal(minNeed.toNumber(), 20*neededAmount);

		// now send some money to the revenue endpoint 
		await moneyflowTable.processFunds(20*neededAmount, {value:20*neededAmount, from:creator});

		// money should end up in the outputs
		var absoluteExpense1Balance = await moneyflowTable.getElementBalance(AbsoluteExpense1Id);
		global.assert.equal(absoluteExpense1Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');

		var relativeExpense2Balance = await moneyflowTable.getElementBalance(RelativeExpense1Id);
		global.assert.equal(relativeExpense2Balance.toNumber(),18*neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await moneyflowTable.getElementBalance(AbsoluteExpense3Id);
		global.assert.equal(absoluteExpense3Balance.toNumber(),1*neededAmount, 'resource point received money from splitter');
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ',async() => {
		const money = web3.toWei(0.0001, "ether");
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

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed',async() => {
		const money = web3.toWei(0.0001, "ether");
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

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed',async() => {
		const money = web3.toWei(0.0001, "ether");
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

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money/100, {value:CURRENT_INPUT*money, gasPrice:0}).should.be.rejectedWith('revert');
		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money/100, gasPrice:0}).should.be.rejectedWith('revert');
		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money/100, {value:CURRENT_INPUT*money, gasPrice:0}).should.be.rejectedWith('revert');
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ',async() => {
		const money = web3.toWei(0.0001, "ether");
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

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money,  gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ',async() => {
		const money = web3.toWei(0.0001, "ether");		
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

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money, gasPrice:0});

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed; ',async() => {
		const money = web3.toWei(0.0001, "ether");
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

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money/100, {value:CURRENT_INPUT*money, gasPrice:0}).should.be.rejectedWith('revert');
		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money, {value:CURRENT_INPUT*money/100, gasPrice:0}).should.be.rejectedWith('revert');
		await struct.moneyflowTable.processFunds(CURRENT_INPUT*money/100, {value:CURRENT_INPUT*money, gasPrice:0}).should.be.rejectedWith('revert');
	});
});
