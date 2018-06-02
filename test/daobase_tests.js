var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");

// to check how upgrade works with IDaoBase clients
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

global.contract('DaoBase', (accounts) => {
	let token;
	let store;
	let daoBase;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];
	const employee3 = accounts[4];

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});

		// add creator as first employee	
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});

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
		await daoBase.allowActionByVoting("upgradeDaoContract", token.address);
	});

	global.it('should set everything correctly',async() => {
		const isMember = await daoBase.isGroupMember("Employees", creator);
		global.assert.equal(isMember,true,'Permission should be set correctly');

		const isMember2 = await daoBase.isGroupMember("Employees", employee1);
		global.assert.equal(isMember2,false,'Permission should be set correctly');

		const isCan = await store.isCanDoByGroupMember(KECCAK256("addNewProposal"), creator);
		global.assert.equal(isCan,true,'Any employee should be able to add new proposal');
		
		const isCan2 = await daoBase.isCanDoAction(creator, "addNewProposal");
		global.assert.equal(isCan2,true,'Creator should be able to call addNewProposal directly');
	});

	global.it('should return correct permissions for an outsider',async() => {
		const isCanDo1 = await daoBase.isCanDoAction(outsider,"addNewProposal");
		const isCanDo2 = await daoBase.isCanDoAction(outsider,"startTask");
		const isCanDo3 = await daoBase.isCanDoAction(outsider,"startBounty");
		global.assert.strictEqual(isCanDo1,false,'Outsider should not be able to do that ');
		global.assert.strictEqual(isCanDo2,false,'Outsider should not be able to do that ');
		global.assert.strictEqual(isCanDo3,false,'Outsider should not be able to do that ');

		const isCanDo4 = await daoBase.isCanDoAction(outsider,"manageGroups");
		const isCanDo5 = await daoBase.isCanDoAction(outsider,"addNewTask");
		const isCanDo6 = await daoBase.isCanDoAction(outsider,"issueTokens");
		global.assert.strictEqual(isCanDo4,false,'Outsider should not be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo5,false,'Outsider should not be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo6,false,'Outsider should not be able to do that because he is in majority');
	});

	global.it('should return correct permissions for creator',async() => {
		const isCanDo1 = await daoBase.isCanDoAction(creator,"addNewProposal");
		const isCanDo2 = await daoBase.isCanDoAction(creator,"startTask");
		const isCanDo3 = await daoBase.isCanDoAction(creator,"startBounty");
		global.assert.strictEqual(isCanDo1,true,'Creator should be able to do that ');
		global.assert.strictEqual(isCanDo2,true,'Creator should be able to do that ');
		global.assert.strictEqual(isCanDo3,true,'Creator should be able to do that ');

		const isCanDo4 = await daoBase.isCanDoAction(creator,"manageGroups");
		const isCanDo5 = await daoBase.isCanDoAction(creator,"addNewTask");
		const isCanDo6 = await daoBase.isCanDoAction(creator,"issueTokens");
		global.assert.strictEqual(isCanDo4,true,'Creator should be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo5,true,'Creator should be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo6,true,'Creator should be able to do that because he is in majority');
	});

	global.it('should not add new vote if not employee',async() => {
		// employee1 is still not added to DaoBase as an employee
		let newProposal = 0x123;
		await CheckExceptions.checkContractThrows(daoBase.addNewProposal.sendTransaction,
			[newProposal, { from: employee1}],
			'Should not add new proposal because employee1 has no permission');
	});

	global.it('should issue tokens to employee1 and employee2',async() => {
		// currently creator has 1000 tokens, he is in majority, so this should not fail
		await daoBase.issueTokens(token.address,employee1,2000,{from: creator});

		// but now creator has 1000 and employee1 has 1000, so creator is not in majority
		// this should fail
		await CheckExceptions.checkContractThrows(daoBase.issueTokens.sendTransaction,
			[token.address, employee2, 1000, { from: creator}],
			'Should not issue more tokens because creator is no longer in majority');

		await token.transfer(employee2, 1000, {from: employee1});

		// CHECK this .at syntax!!!
		const balance1 = await token.balanceOf(creator);
		global.assert.equal(balance1,1000,'initial balance');

		const balance2 = await token.balanceOf(employee1);
		global.assert.equal(balance2,1000,'employee1 balance');
		
		const balance3 = await token.balanceOf(employee2);
		global.assert.equal(balance3,1000,'employee2 balance');
	});

	global.it('should be able to upgrade',async() => {
		// one client of the IDaoBase (to test how upgrade works with it)
		let moneyflowInstance = await MoneyFlow.new(daoBase.address,{from: creator});

		await daoBase.allowActionByAnyMemberOfGroup("upgradeDaoContract","Employees");
		await daoBase.allowActionByAddress("withdrawDonations", creator);

		// UPGRADE!
		let daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		await daoBase.upgradeDaoContract(daoBaseNew.address, {gas: 10000000, from: creator});

		await daoBaseNew.issueTokens(token.addresss, employee1,1000,{from: creator});

		// check employee1 balance
		const balance1 = await token.balanceOf(employee1);
		global.assert.equal(balance1,1000,'balance should be updated');

		await daoBaseNew.addGroupMember("Employees", employee1,{from: creator});
		const isEmployeeAdded = await daoBaseNew.isGroupMember("Employees",employee1);
		global.assert.strictEqual(isEmployeeAdded,true,'employee1 should be added as the company`s employee');

		await CheckExceptions.checkContractThrows(daoBase.addGroupMember,
			["Employees", employee2, { from: creator}],
			'Should not add new employee to old MC');

		await CheckExceptions.checkContractThrows(daoBase.issueTokens,
			[token.address, employee2, 100, { from: creator}],
			'Should not issue tokens through MC');

		// now try to withdraw donations with new mc
		const money = 1000000000;
		const dea = await moneyflowInstance.getDonationEndpoint(); 
		const donationEndpoint = await IWeiReceiver.at(dea);
		await donationEndpoint.processFunds(money, { from: creator, value: money, gasPrice: 0});

		let donationBalance = await web3.eth.getBalance(donationEndpoint.address);
		global.assert.equal(donationBalance.toNumber(),money, 'all money at donation point now');

		// withdraw
		let outBalance = await web3.eth.getBalance(outsider);
		await moneyflowInstance.withdrawDonationsTo(outsider,{from:creator, gas:100000, gasPrice: 0});

		let outBalance2 = await web3.eth.getBalance(outsider);
		let balanceDelta = outBalance2.toNumber() - outBalance.toNumber();

		// TODO: fix that!!!
		// TODO: why not working? 
		//global.assert.equal(balanceDelta, money, 'all donations now on outsiders`s balance');

		let donationBalance2 = await web3.eth.getBalance(donationEndpoint.address);
		global.assert.equal(donationBalance2.toNumber(),0, 'all donations now on creator`s balance');
	});

	global.it('should add group members',async() => {
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);

		await CheckExceptions.checkContractThrows(daoBase.addGroupMember, 
			["Employees", employee3]); //Shouldnt add again

		global.assert.strictEqual(await daoBase.isGroupMember("Employees", employee1,{from:creator}),
			true, 'Should be in the group')
		global.assert.strictEqual(await daoBase.isGroupMember("Employees", employee2,{from:creator}),
			true, 'Should be in the group')
		global.assert.strictEqual(await daoBase.isGroupMember("Employees", employee3,{from:creator}),
			true, 'Should be in the group')

		global.assert.equal(4, await daoBase.getMembersCount("Employees"), '3 employees + creator');

		await daoBase.removeGroupMember("Employees", employee3, {from:creator});
	
		global.assert.strictEqual(await daoBase.isGroupMember("Employees", employee3,{from:creator}),
			false, 'Should not be in the group')

		let GP = await daoBase.getMembersCount("Employees");
		console.log('GP:', GP)
		// await daoBase.getGroupParticipants
		global.assert.equal(3, (await daoBase.getMembersCount("Employees")).toNumber(), '2 employees + creator');

	});
});

