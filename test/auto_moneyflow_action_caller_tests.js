var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var AutoMoneyflowActionCaller = artifacts.require("./AutoMoneyflowActionCaller");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

global.contract('AutoMoneyflowActionCaller', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const outsider = accounts[4];
	const output = accounts[5]; 

	let money = web3.toWei(0.001, "ether");

	global.beforeEach(async() => {

	});

	global.it('should allow to get donations using AAC (direct call)',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);

		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});
		let daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});

		let aacInstance = await AutoMoneyflowActionCaller.new(daoBase.address, moneyflowInstance.address, {from: creator, gas: 10000000});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);
			await store.addGroupMember("Employees", employee1);
			await store.addGroupMember("Employees", employee2);

			await store.allowActionByAddress("manageGroups", creator);

			await store.allowActionByAnyMemberOfGroup("addNewEmployee","Employees");
			await store.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

			await store.allowActionByVoting("withdrawDonations", token.address);

			// AAC requires special permissions
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("withdrawDonations", aacInstance.address);
			await store.allowActionByAddress("addNewTask", aacInstance.address);
			await store.allowActionByAddress("setRootWeiReceiver", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// check permissions
		const isCanWithdraw = await daoBase.isCanDoAction(creator,"withdrawDonations");
		global.assert.equal(isCanWithdraw, true, 'Creator should be able to withdrawDonations directly without voting');

		// send some money
		const dea = await moneyflowInstance.getDonationEndpoint(); 
		global.assert.notEqual(dea,0x0, 'donation endpoint should be created');
		const donationEndpoint = await IWeiReceiver.at(dea);
		await donationEndpoint.processFunds(money, { from: creator, value: money});

		let donationBalance = await web3.eth.getBalance(donationEndpoint.address);
		global.assert.equal(donationBalance.toNumber(),money, 'all money at donation point now');

		// get the donations 
		let pointBalance = await web3.eth.getBalance(output);
		// this will call the action directly!
		await aacInstance.withdrawDonationsToAuto(output, {from:creator, gas:100000});
		const proposalsCount1 = await daoBase.getProposalsCount();
		global.assert.equal(proposalsCount1,0,'No proposals should be added');

		let pointBalance2 = await web3.eth.getBalance(output);
		const receiverDelta = pointBalance2.toNumber() - pointBalance.toNumber();

		global.assert.notEqual(receiverDelta, 0, 'Donations should be withdrawn');
	});

	global.it('should allow to get donations using AAC (with voting)',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);

		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});
		let daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});

		let aacInstance = await AutoMoneyflowActionCaller.new(daoBase.address, moneyflowInstance.address, {from: creator, gas: 10000000});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);
			await store.addGroupMember("Employees", employee1);
			await store.addGroupMember("Employees", employee2);

			await store.allowActionByAddress("manageGroups", creator);

			await store.allowActionByAnyMemberOfGroup("addNewEmployee","Employees");
			await store.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

			await store.allowActionByVoting("withdrawDonations", token.address);

			// AAC requires special permissions
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("withdrawDonations", aacInstance.address);
			await store.allowActionByAddress("addNewTask", aacInstance.address);
			await store.allowActionByAddress("setRootWeiReceiver", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// TODO: implement test 
	});

});
