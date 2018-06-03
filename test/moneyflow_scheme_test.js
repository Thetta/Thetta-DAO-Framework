var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");

var DefaultMoneyflowSchemeWithUnpackers = artifacts.require("./DefaultMoneyflowSchemeWithUnpackers"); 

function KECCAK256 (x){
	return web3.sha3(x);
}

global.contract('Scheme', (accounts) => {
	let token;
	let store;
	let daoBase;
	let moneyflowInstance;
	let moneyflowScheme;

	let money = web3.toWei(0.001, "ether");

	const creator = accounts[0];
	const output = accounts[1];

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});
		daoBase = await DaoBase.new(store.address,{gas: 10000000, from: creator});

		// 50/50 between reserve fund and dividends 
		moneyflowScheme = await DefaultMoneyflowSchemeWithUnpackers.new(daoBase.address, output, 5000, 5000, {from: creator});

		// add creator as first employee	
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// Set permissions:
		await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("startTask","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("startBounty","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

		await daoBase.allowActionByVoting("manageGroups", token.address);
		await daoBase.allowActionByVoting("addNewTask", token.address);
		await daoBase.allowActionByVoting("issueTokens", token.address);

		// for moneyscheme!
		await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");
		await daoBase.allowActionByVoting("withdrawDonations", token.address);

		moneyflowInstance = await MoneyFlow.new(daoBase.address,{from: creator});

		const root = await moneyflowScheme.getRootReceiver();
		await moneyflowInstance.setRootWeiReceiver(root, {from: creator});
	});

	global.it('should set everything correctly',async() => {
		// TODO: test DefaultMoneyflowScheme
	});

});
