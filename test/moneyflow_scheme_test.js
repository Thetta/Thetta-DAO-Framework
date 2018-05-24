var Microcompany = artifacts.require("./Microcompany");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

var MoneyFlow = artifacts.require("./MoneyFlow");
var WeiFund = artifacts.require("./WeiFund");

var DefaultMoneyflowSchemeWithUnpackers = artifacts.require("./DefaultMoneyflowSchemeWithUnpackers"); 

global.contract('Moneyflow', (accounts) => {
	let token;
	let store;
	let mcInstance;
	let moneyflowInstance;
	let moneyflowScheme;

	let money = web3.toWei(0.001, "ether");

	const creator = accounts[0];
	const output = accounts[1];

	global.beforeEach(async() => {

	});

	global.it('should set everything correctly',async() => {
		token = await StdMicrocompanyToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await MicrocompanyStorage.new(token.address,{gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(store.address,{gas: 10000000, from: creator});

		// 50/50 between reserve fund and dividends 
		moneyflowScheme = await DefaultMoneyflowSchemeWithUnpackers.new(mcInstance.address, output, 5000, 5000, {from: creator});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			// manually setup the Default organization 
			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
			
			// this is a list of actions that require voting
			await store.allowActionByVoting("manageGroups", token.address);
			await store.allowActionByVoting("addNewTask", token.address);
			await store.allowActionByVoting("issueTokens", token.address);
			await store.allowActionByVoting("upgradeMicrocompany", token.address);

			// for moneyscheme!
			await store.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");
			await store.allowActionByVoting("withdrawDonations", token.address);
		}

		moneyflowInstance = await MoneyFlow.new(mcInstance.address,{from: creator});

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		const root = await moneyflowScheme.getRootReceiver();
		await moneyflowInstance.setRootWeiReceiver(root, {from: creator});

		// TODO: test DefaultMoneyflowScheme
	});

});
