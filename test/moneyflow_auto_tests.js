var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var Voting = artifacts.require("./Voting");
var Voting_1p1v = artifacts.require("./Voting_1p1v");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

var utf8 = require('utf8');

function UintToToBytes32(n) {
	n = Number(n).toString(16);
	while (n.length < 64) {
		n = "0" + n;
	}
	return "0x" + n;
}

function padToBytes32(n) {
	while (n.length < 64) {
		n = n + "0";
	}
	return "0x" + n;
}

function fromUtf8(str) {
	str = utf8.encode(str);
	var hex = "";
	for (var i = 0; i < str.length; i++) {
		var code = str.charCodeAt(i);
		if (code === 0) {
			break;
		}
		var n = code.toString(16);
		hex += n.length < 2 ? '0' + n : n;
	}

	return padToBytes32(hex);
};

global.contract('MoneyflowAuto', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const outsider = accounts[4];
	const output = accounts[5]; 

	let token;
	let daoBase;
	let moneyflowInstance;
	let aacInstance;

	let money = web3.toWei(0.001, "ether");

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);

		let store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});

		aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, {from: creator, gas: 10000000});

		///////////////////////////////////////////////////
		// SEE THIS? set voting type for the action!
		const VOTING_TYPE_1P1V = 1;
		const VOTING_TYPE_SIMPLE_TOKEN = 2;

		await aacInstance.setVotingParams("withdrawDonations", VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(50), 0);
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(50), 0);

		// add creator as first employee	
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);

		await daoBase.allowActionByAnyMemberOfGroup("addNewEmployee","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");
		await daoBase.allowActionByAddress("issueTokens", creator);
		await daoBase.allowActionByVoting("withdrawDonations", token.address);

		// AAC requires special permissions
		await daoBase.allowActionByAddress("addNewProposal", aacInstance.address);
		// these actions required if AAC will call this actions DIRECTLY (without voting)
		await daoBase.allowActionByAddress("withdrawDonations", aacInstance.address);
		await daoBase.allowActionByAddress("addNewTask", aacInstance.address);
		await daoBase.allowActionByAddress("setRootWeiReceiver", aacInstance.address);
		await daoBase.allowActionByAddress("modifyMoneyscheme", aacInstance.address);
	});

	global.it('should create new voting', async()=>{
		let isGroupMember = await daoBase.isGroupMember('Employees', creator);
		global.assert.equal(isGroupMember,true, 'Creator is ein the group');
		let voting = await Voting_1p1v.new(daoBase.address, creator, creator, 0, "Employees", 51, 51, 17);
		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		let groupName = await voting.groupName();
		global.assert.equal(quorumPercent.toNumber(), 51, 'quorumPercent should be 51'); 
		global.assert.equal(consensusPercent.toNumber(), 51, 'consensusPercent should be 51'); 
		global.assert.equal(groupName, "Employees", 'groupName should be Employees'); 
	})

	global.it('should allow to get donations using AAC (direct call)',async() => {
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

		global.assert.equal(receiverDelta, money, 'Donations should be withdrawn');
	});

	global.it('should allow to get donations using AAC (with voting)',async() => {
		const isCanWithdraw = await daoBase.isCanDoAction(employee1,"withdrawDonations");
		global.assert.equal(isCanWithdraw, false, 'Creator should be not able to withdrawDonations directly without voting');

		// send some money
		const dea = await moneyflowInstance.getDonationEndpoint(); 
		global.assert.notEqual(dea,0x0, 'donation endpoint should be created');
		const donationEndpoint = await IWeiReceiver.at(dea);
		await donationEndpoint.processFunds(money, { from: employee1, value: money});

		let donationBalance = await web3.eth.getBalance(donationEndpoint.address);
		global.assert.equal(donationBalance.toNumber(),money, 'all money at donation point now');

		// get the donations 
		let pointBalance = await web3.eth.getBalance(output);

		// this will call the action directly!
		await aacInstance.withdrawDonationsToAuto(output, {from:employee1});
		let proposalsCount1 = await daoBase.getProposalsCount();
		global.assert.equal(proposalsCount1, 1, 'Proposal should be added');

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);

		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		let groupName = await voting.groupName();
		console.log('quorumPercent:', quorumPercent.toNumber(), 'consensusPercent:', consensusPercent.toNumber(), 'groupName:', groupName);

		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});

		// check voting results again
		const r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');

		let pointBalance2 = await web3.eth.getBalance(output);

		let receiverDelta2 = pointBalance2.toNumber() - pointBalance.toNumber();

		let donationBalance2 = await web3.eth.getBalance(donationEndpoint.address);

		global.assert.equal(receiverDelta2, money, 'Donations should be withdrawn');
	});

	global.it('should allow to set root receiver using AAC (direct call)',async() => {
		// check permissions (permissions must be blocked)
		await daoBase.allowActionByAddress("modifyMoneyscheme", aacInstance.address);

		const isCanDoAction = await daoBase.isCanDoAction(employee1, "setRootWeiReceiver");
		global.assert.equal(isCanDoAction, false, 'Employee should not have permissions to run setRootWeiReceiver action');

		// THIS IS REQUIRED because employee1 have to be able to run action
		await daoBase.allowActionByAnyMemberOfGroup("setRootWeiReceiver", "Employees");

		const isCanDoAction2 = await daoBase.isCanDoAction(employee1, "setRootWeiReceiver");
		global.assert.equal(isCanDoAction2, true, 'Now employee should have permissions to run setRootWeiReceiver action');

		const wae = await WeiAbsoluteExpense.new(1000);

		// checking action direct call (without voting)
		await aacInstance.setRootWeiReceiverAuto(wae.address, { from:employee1});

		// check proposals after action called
		const proposalsCount = await daoBase.getProposalsCount();
		global.assert.equal(proposalsCount, 0, 'No proposals should be added');

		let RE = await moneyflowInstance.getRevenueEndpoint();
		global.assert.equal(RE, wae.address, 'RootWeiReceiver should be set');
	});

	global.it('should allow to set root receiver using AAC (with voting)',async() => {
		// check permissions (permissions must be blocked)
		const isCanDoAction = await daoBase.isCanDoAction(employee1, "setRootWeiReceiver");
		global.assert.equal(isCanDoAction, false, 'Employee should not have permission to run setRootWeiReceiver action');

		await daoBase.allowActionByVoting("setRootWeiReceiver", token.address);

		// check proposals (must be empty)
		const proposalsCount = await daoBase.getProposalsCount();
		global.assert.equal(proposalsCount, 0, 'No proposals should be added');

		const wae = await WeiAbsoluteExpense.new(1000);

		// checking action with voting required
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const proposalsCount2 = await daoBase.getProposalsCount();

		global.assert.equal(proposalsCount2.toNumber(), 1, 'One new proposal should be added');

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});

		// check voting results again
		const r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');

		let RE = await moneyflowInstance.getRevenueEndpoint();
		global.assert.equal(RE, wae.address, 'RootWeiReceiver should be set');
	});
});
