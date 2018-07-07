var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");

var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var WeiRelativeExpense = artifacts.require("./WeiRelativeExpense");
var WeiAbsoluteExpenseWithPeriod = artifacts.require("./WeiAbsoluteExpenseWithPeriod");
var WeiRelativeExpenseWithPeriod = artifacts.require("./WeiRelativeExpenseWithPeriod");

var DefaultMoneyflowSchemeWithUnpackers = artifacts.require("./DefaultMoneyflowSchemeWithUnpackers"); 

function KECCAK256 (x){
	return web3.sha3(x);
}

contract('Scheme', (accounts) => {
	let token;
	let store;
	let daoBase;
	let moneyflowInstance;
	let moneyflowScheme;

	let money = web3.toWei(0.001, "ether");

	const creator = accounts[0];
	const employee1 = accounts[1];
	const output = accounts[2];

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, true, 1000000000);
		await token.mint(creator, 1000);
		store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBase.new(store.address,{ from: creator });
		// await web3.eth.sendTransaction({from:creator, to:employee1, amount:990000000000000000000})
		// 50/50 between reserve fund and dividends 

		var b1 = await web3.eth.getBalance(creator);
		moneyflowScheme = await DefaultMoneyflowSchemeWithUnpackers.new(daoBase.address, output, 5000, 5000, {from: creator, gasPrice:1});
		// await WeiTopDownSplitter.new('abc', {from: creator, gasPrice:1});
		var b2 = await web3.eth.getBalance(creator);

		console.log('estimateGas:', await moneyflowScheme.deployRoot.estimateGas({from: creator}))
		await moneyflowScheme.deployRoot({from: creator, gasPrice:1});
		var b3 = await web3.eth.getBalance(creator);		
		// await WeiUnsortedSplitter.new('def', {from: creator, gasPrice:1});
		// var b3 = await web3.eth.getBalance(creator);
		// await WeiTopDownSplitter.addChild(WeiUnsortedSplitter.address, {from: creator, gasPrice:1});
		// var b4 = await web3.eth.getBalance(creator);

		console.log('wei delta:', b1.toNumber() - b2.toNumber());
		console.log('wei delta:', b2.toNumber() - b3.toNumber());
		// console.log('wei delta:', b3.toNumber() - b4.toNumber());
		// // add creator as first employee
		// await store.addGroupMember(KECCAK256("Employees"), creator);
		// await store.allowActionByAddress(KECCAK256("manageGroups"),creator);
		// await store.allowActionByAddress(KECCAK256("setRootWeiReceiver"),creator);

		// // do not forget to transfer ownership
		// await token.transferOwnership(daoBase.address);
		// await store.transferOwnership(daoBase.address);

		// // Set permissions:
		// await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
		// await daoBase.allowActionByAnyMemberOfGroup("startTask","Employees");
		// await daoBase.allowActionByAnyMemberOfGroup("startBounty","Employees");
		// await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

		// await daoBase.allowActionByVoting("manageGroups", token.address);
		// await daoBase.allowActionByVoting("addNewTask", token.address);
		// await daoBase.allowActionByVoting("issueTokens", token.address);

		// // for moneyscheme!
		// await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");
		// await daoBase.allowActionByVoting("withdrawDonations", token.address);

		// moneyflowInstance = await MoneyFlow.new(daoBase.address);

		// const root = await moneyflowScheme.getRootReceiver();
		// await moneyflowInstance.setRootWeiReceiver(root, {from: creator});
	});

	it('should set everything correctly',async() => {
		// TODO: test DefaultMoneyflowScheme
	});

});
