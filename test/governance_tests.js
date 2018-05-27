var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var AutoDaoBaseActionCaller = artifacts.require("./AutoDaoBaseActionCaller");
var AutoMoneyflowActionCaller = artifacts.require("./AutoMoneyflowActionCaller");

var DefaultMoneyflowSchemeWithUnpackers = artifacts.require("./DefaultMoneyflowSchemeWithUnpackers");
var DefaultMoneyflowScheme = artifacts.require("./DefaultMoneyflowScheme");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

global.contract('Voting', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const outsider = accounts[4];
	const output = accounts[5]; 

	let money = web3.toWei(0.001, "ether");

	global.beforeEach(async() => {

	});
	
	global.it('should not automatically create proposal because AAC has no rights',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		let daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let aacInstance = await AutoDaoBaseActionCaller.new(daoBase.address, {from: creator});

		{
			// add creator as first employee	
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

			await store.allowActionByVoting("manageGroups", token.address);
			await store.allowActionByVoting("issueTokens", token.address);

			// THIS IS REQUIRED because issueTokensAuto() will add new proposal (voting)
			// because of this AAC can't add new proposal!
			// 
			//await store.allowActionByAddress("addNewProposal", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		const proposalsCount1 = await daoBase.getProposalsCount();
		global.assert.equal(proposalsCount1,0,'No proposals should be added');

		// add new employee1
		await daoBase.addGroupMember("Employees",employee1,{from: creator});
		const isEmployeeAdded = await daoBase.isGroupMember("Employees", employee1);
		global.assert.strictEqual(isEmployeeAdded,true,'employee1 should be added as the company`s employee');

		// new proposal should NOT be added 
		await CheckExceptions.checkContractThrows(aacInstance.issueTokensAuto.sendTransaction,
			[employee1,1000,{ from: employee1}],
			'Should not be able to issue tokens AND add new proposal');

		const proposalsCount2 = await daoBase.getProposalsCount();
		global.assert.equal(proposalsCount2,0,'No new proposal should be added'); 
	});

	// TODO:
});


