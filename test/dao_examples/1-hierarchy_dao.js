var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");

var DaoBase = artifacts.require("./DaoBase");
var DaoBaseAuto = artifacts.require("./DaoBaseAuto");

var MoneyFlow = artifacts.require("./MoneyFlow");
var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

// DAO factories
var HierarchyDaoFactory = artifacts.require("./HierarchyDaoFactory"); 

var CheckExceptions = require('../utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

contract('HierarchyDaoFactory', (accounts) => {
	let token;
	let store;
	let daoBase;

	const creator = accounts[0];

	const boss = accounts[1];
	const employee1 = accounts[2];
	const employee2 = accounts[3];
	const employee3 = accounts[4];
	const employee4 = accounts[5];

	const manager1 = accounts[6];
	const manager2 = accounts[7];

	beforeEach(async() => {

	});

	/*
	it('should create Boss -> Managers -> Employees hierarchy',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18);
		//await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});
		let daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let aacInstance = await DaoBaseAuto.new(daoBase.address, {from: creator});

		{
			// add creator as first employee
			await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

			// do not forget to transfer ownership
			await token.transferOwnership(daoBase.address);
			await store.transferOwnership(daoBase.address);

			// 1 - grant all permissions to the boss (i.e. "the monarch")
			await daoBase.addGroupMember("Managers", boss);
			await daoBase.addGroupMember("Employees", boss);
			await daoBase.allowActionByAddress("modifyMoneyscheme",boss);
			await daoBase.allowActionByAddress("issueTokens", boss);
			await daoBase.allowActionByAddress("upgradeDaoContract", boss);
			await daoBase.allowActionByAddress("withdrawDonations", boss);
			await daoBase.allowActionByAddress("flushReserveFundTo", boss);
			await daoBase.allowActionByAddress("flushDividendsFundTo", boss);

			// 2 - set Managers group permissions
			await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Managers");
			await daoBase.allowActionByAnyMemberOfGroup("addNewTask","Managers");
			await daoBase.allowActionByAnyMemberOfGroup("startTask","Managers");
			await daoBase.allowActionByAnyMemberOfGroup("startBounty","Managers");

			// 3 - set Employees group permissions 
			await daoBase.allowActionByAnyMemberOfGroup("startTask","Employees");
			await daoBase.allowActionByAnyMemberOfGroup("startBounty","Employees");

			// 4 - the rest is by voting only (requires addNewProposal permission)
			// so accessable by Managers only even with voting
			await daoBase.allowActionByVoting("manageGroups", token.address);
			await daoBase.allowActionByVoting("modifyMoneyscheme", token.address);

			// 5 - set the auto caller
			const VOTING_TYPE_1P1V = 1;
			//const VOTING_TYPE_SIMPLE_TOKEN = 2;
			await aacInstance.setVotingParams("manageGroups", VOTING_TYPE_1P1V, (24 * 60), "Managers", 51, 50, 0);
			await aacInstance.setVotingParams("modifyMoneyscheme", VOTING_TYPE_1P1V, (24 * 60), "Managers", 51, 50, 0);

			await daoBase.allowActionByAddress("addNewProposal", aacInstance.address);
			await daoBase.allowActionByAddress("manageGroups", aacInstance.address);
			await daoBase.allowActionByAddress("modifyMoneyscheme", aacInstance.address);
		}

		// Now populate groups
		await daoBase.addGroupMember("Managers", manager1);
		await daoBase.addGroupMember("Managers", manager2);

		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);
		await daoBase.addGroupMember("Employees", employee4);
	});
	*/

	it('should create Boss -> Managers -> Employees hierarchy using HierarchyDaoFactory',async() => {
		let mgrs = [manager1, manager2];
		let empls = [employee1, employee2];

		let hdf = await HierarchyDaoFactory.new(boss, mgrs, empls, {gas: 155000000, from: creator, gasPrice:0});

		const daoAddress = await hdf.dao();
		const daoBase = await DaoBase.at(daoAddress);

		/*
		// Create AAC manually
		// 
		// WARNING:
		// Unfortunately creating DaoBaseAuto in the HierarchyDaoFactory caused some weird bug 
		// with OutOfGas...That's why i moved DaoBaseAuto creation here
		//
		let aac = await DaoBaseAuto.new(daoBase.address, {from: creator});
		await aac.transferOwnership(hdf.address, {from: creator});

		// Create AMAC manually
		let moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});
		let amac = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, 
			{from: creator, gas: 10000000});
		await amac.transferOwnership(hdf.address, {from: creator});

		await hdf.setupAac(aac.address, {from: creator});
		await hdf.setupAmac(amac.address, {from: creator});

		// test permissions 
		// 1 - check if AAC has manageGroups perm. 
		const isCan = await daoBase.isCanDoAction(aac.address, "manageGroups");
		assert.equal(isCan, true, 'AAC should be able to <manageGroups>');
		*/
	});
});

