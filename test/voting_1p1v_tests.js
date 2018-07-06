var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var InformalProposal = artifacts.require("./InformalProposal");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var Voting_1p1v = artifacts.require("./Voting_1p1v");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

var utf8 = require('utf8');

function padToBytes32(n) {
	while (n.length < 64) {
		n = n + "0";
	}
	return "0x" + n;
}

function UintToToBytes32(n) {
	n = Number(n).toString(16);
	while (n.length < 64) {
		n = "0" + n;
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

contract('Voting_1p1v(quorumPercent, consensusPercent)', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const employee4 = accounts[4];
	const employee5 = accounts[5];

	const outsider  = accounts[6];
	const output    = accounts[7]; 

	let r2;
	let token;
	let daoBase;
	let moneyflowInstance;
	let aacInstance;
	
	let issueTokens;
	let manageGroups;
	let addNewProposal;
	let startTask;
	let withdrawDonations;
	let setRootWeiReceiver;

	let money = web3.toWei(0.001, "ether");
	let VOTING_TYPE_1P1V = 1;

	beforeEach(async() => {

		token = await StdDaoToken.new("StdToken","STDT",18, true, true, true, 1000000000);
		await token.mint(creator, 1000);

		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});
		aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, {from: creator});
		
		issueTokens = await daoBase.ISSUE_TOKENS();
		
		manageGroups = await daoBase.MANAGE_GROUPS();

		addNewProposal = await daoBase.ADD_NEW_PROPOSAL();
		
		burnTokens = await daoBase.BURN_TOKENS();

		withdrawDonations = await moneyflowInstance.WITHDRAW_DONATIONS();

		setRootWeiReceiver = await moneyflowInstance.SET_ROOT_WEI_RECEIVER();

		// SEE THIS? set voting type for the action!
		const VOTING_TYPE_1P1V = 1;
		const VOTING_TYPE_SIMPLE_TOKEN = 2;

		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(manageGroups,creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// AAC requires special permissions
		await daoBase.allowActionByAddress(addNewProposal, aacInstance.address);
		await daoBase.allowActionByAddress(withdrawDonations, aacInstance.address);
		await daoBase.allowActionByAddress(setRootWeiReceiver, aacInstance.address);

		// do not forget to transfer ownership
		await daoBase.allowActionByAnyMemberOfGroup(addNewProposal,"Employees");

		await daoBase.allowActionByVoting(manageGroups, token.address);
		await daoBase.allowActionByVoting(issueTokens, token.address);

		// check permissions (permissions must be blocked)
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);
		await daoBase.addGroupMember("Employees", employee4);
		// await daoBase.addGroupMember("Employees", creator);
	});

	it('0. should create new voting', async()=>{
		let isGroupMember = await daoBase.isGroupMember('Employees', employee1);
		assert.equal(isGroupMember,true, 'Creator is ein the group');
		let voting = await Voting_1p1v.new(daoBase.address, employee1, employee1, 60, "Employees", 51, 71);
		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		let groupName = await voting.groupName();
		assert.equal(quorumPercent.toNumber(), 51, 'quorumPercent should be 51'); 
		assert.equal(consensusPercent.toNumber(), 71, 'consensusPercent should be 51'); 
		assert.equal(groupName, "Employees", 'groupName should be Employees'); 
	})

	it('should create and use 1p1v voting while members change',async() => {
		await daoBase.addGroupMember("Employees", employee5);
		let proposal = await InformalProposal.new('Take the money and run again', {from:creator});
		let voting = await Voting_1p1v.new(daoBase.address, proposal.address, creator, 0, "Employees", 51, 90, {from:creator});

		// vote by first, check results  (getVotingStats, isFinished, isYes, etc) 
		await voting.vote(true,0,{from:employee1});

		var r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		assert.equal(r2[1].toNumber(),0,'no');
		assert.equal(r2[2].toNumber(),6,'creator + 5 employee');

		await daoBase.removeGroupMember("Employees", employee1, {from:creator});
		// remove 2nd employee from the group 

		var r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');			// 1 already voted (who started the voting)
		assert.equal(r2[1].toNumber(),0,'no');
		assert.equal(r2[2].toNumber(),5,'creator + 4 employee');

		await voting.vote(true,0,{from:employee2});

		var r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		assert.equal(r2[1].toNumber(),0,'no');

		await CheckExceptions.checkContractThrows(
			voting.vote, [true,0,{from:employee2}]);

		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee3});

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished: 4/6 voted');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished: 4/6 voted, all said yes');
		await daoBase.removeGroupMember("Employees", employee3, {from:creator});

		// WARNING:
		// if voting is finished -> even if we remove some employees from the group 
		// the voting results should not be changed!!!
		// 
		// BUT the 'getVotingStats()' will return different results
		var emps = await daoBase.getMembersCount("Employees");
		assert.equal(4, emps, '4 employees');

		var res = await voting.getVotingStats();
		assert.strictEqual(res[0].toNumber(),2,'');
		assert.strictEqual(res[1].toNumber(),0,'');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished: 4/6 voted');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished: 4/6 voted, all said yes');
	});

	it('1.1. Q Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(100), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),2,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(true,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(true,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),4,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(true,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2
			[0].toNumber(),5,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	});

	it('1.2. Q Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(10), UintToToBytes32(100), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);

		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 10'); 
		assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100'); 

		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	});

	it('1.3. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,10) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(10), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100'); 
		assert.equal(consensusPercent.toNumber(), 10, 'consensusPercent should be 10'); 

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),1,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),2,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),4,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	});

	it('1.4. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),1,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),2,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),4,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	});

	it('1.5. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(21), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),1,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),2,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),4,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.6. Q Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),1,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),1,'yes');
		assert.equal(r2[1].toNumber(),2,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.7. Q Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),2,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),2,'yes');
		assert.equal(r2[1].toNumber(),1,'no');

		assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	});

	it('1.8. T Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

		await voting.vote(true,0,{from:employee3});
		assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 25 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting should not be finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is not finished');
	})

	it('1.9. T Scenario: no yes yes, params(100,20) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		await voting.vote(false,0,{from:employee3});

		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is  finished');
	})

	it('1.10. T Scenario: no no no yes yes, params(100,20) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		await voting.vote(false,0,{from:employee3});
		await voting.vote(false,0,{from:employee4});
		await voting.vote(false,0);

		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');

	})

	it('1.11. T Scenario: yes no no yes, params(50,50) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		await voting.vote(false,0,{from:employee3});

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [1800 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee4});

		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [1800 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');
	})

	it('1.12. T Scenario: yes, params(20,20) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(20), UintToToBytes32(20), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
		assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	})

	it('1.13. T Scenario: yes yes no no, params(51,51) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(51), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		await voting.vote(false,0,{from:employee3});
		await voting.vote(true,0,{from:employee4});

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is no');

	})

	it('1.14. T Scenario: yes, params(21,21) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(21), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is no');
	})

	it('1.15. T Scenario: yes no, params(21,21) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(51), 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_1p1v.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0', 
			method: 'evm_increaseTime',
			params: [3600 * 1 * 1000],
			id: new Date().getTime()
		}, function(err){if(err) console.log('err:', err)});

		assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is no');
	})
});
