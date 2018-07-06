var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var InformalProposal = artifacts.require("./InformalProposal");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var Voting_SimpleToken = artifacts.require("./Voting_SimpleToken");
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

function addressToBytes32(addr){
	while (addr.length < 66) {
		addr = '0' + addr;
	}
	return '0x' + addr.replace('0x', '');
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

contract('Voting_Quadratic(quorumPercent, consensusPercent)', (accounts) => {
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
	let withdrawDonations;
	let setRootWeiReceiver;

	let money = web3.toWei(0.001, "ether");

	// SEE THIS? set voting type for the action!
	const VOTING_TYPE_1P1V = 1;
	const VOTING_TYPE_QUADRATIC = 3;

	beforeEach(async() => {

		token = await StdDaoToken.new("StdToken","STDT",18, true, true, true, 1000000000);
		await token.mint(creator, 25);
		await token.mint(employee1, 11);
		await token.mint(employee2, 9);
		await token.mint(employee3, 4);
		await token.mint(employee4, 16);
		// await token.mint(employee5, 1);
		
		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});
		aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, { from: creator });
		
		issueTokens = await daoBase.ISSUE_TOKENS();
		
		manageGroups = await daoBase.MANAGE_GROUPS();

		addNewProposal = await daoBase.ADD_NEW_PROPOSAL();

		withdrawDonations = await moneyflowInstance.WITHDRAW_DONATIONS();

		setRootWeiReceiver = await moneyflowInstance.SET_ROOT_WEI_RECEIVER();

		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(manageGroups,creator);
		await store.allowActionByAddress(issueTokens,creator);

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
		await daoBase.allowActionByVoting(addNewProposal, token.address);

		// check permissions (permissions must be blocked)
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);
		await daoBase.addGroupMember("Employees", employee4);
		// await daoBase.addGroupMember("Employees", creator);
	});

	it('1.1. Q Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),6,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(true,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),8,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(true,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),12,'yes');
		assert.equal(r2[1].toNumber(),0,'no');
		
		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(true,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),17,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.2. Q Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(10), UintToToBytes32(100), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);

		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 10'); 
		assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100'); 

		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.3. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,10) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(10), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100'); 
		assert.equal(consensusPercent.toNumber(), 10, 'consensusPercent should be 10'); 

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),5,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),9,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),14,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.4. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),5,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),9,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),14,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.5. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(21), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),5,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),9,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0);
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),14,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.6. Q Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),3,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),3,'yes');
		assert.equal(r2[1].toNumber(),5,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	it('1.7. Q Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
		await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting_SimpleToken.at(votingAddress);
		assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),6,'yes');
		assert.equal(r2[1].toNumber(),0,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getVotingStats();
		assert.equal(r2[0].toNumber(),6,'yes');
		assert.equal(r2[1].toNumber(),2,'no');

		assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});


});
