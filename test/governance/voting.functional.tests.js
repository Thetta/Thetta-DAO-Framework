var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var InformalProposal = artifacts.require("./InformalProposal");
var GenericProposal = artifacts.require("./GenericProposal");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

const BigNumber = web3.BigNumber;

const VOTING_TYPE_1P1V = 1;
const VOTING_TYPE_SIMPLE_TOKEN = 2;
const VOTING_TYPE_QUADRATIC = 3;
const VOTING_TYPE_LIQUID = 4;

var increaseTime = require('../utils/increaseTime');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

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

contract('Voting (func)', (accounts) => {
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
	let addNewTask;
	let withdrawDonations;
	let setRootWeiReceiver;

	let money = web3.toWei(0.001, "ether");

	describe('simple voting()', function () {
		beforeEach(async() => {
			token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
			await token.mintFor(creator, 1);
			await token.mintFor(employee1, 1);
			await token.mintFor(employee2, 1);
			await token.mintFor(employee3, 1);
			await token.mintFor(employee4, 1);
			// await token.mintFor(employee5, 1);

			let store = await DaoStorage.new([token.address],{ from: creator });
			daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
			moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});
			aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, {from: creator});

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

		it('0. should create new voting', async()=>{
			let isGroupMember = await daoBase.isGroupMember('Employees', employee1);
			assert.equal(isGroupMember,true, 'Creator is ein the group');
			let voting = await Voting.new(daoBase.address, employee1, employee1, VOTING_TYPE_SIMPLE_TOKEN, 60, '', 51, 71, token.address);
			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 51, 'quorumPercent should be 51');
			assert.equal(consensusPercent.toNumber(), 71, 'consensusPercent should be 51');
		});

		it('1.1. Q Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),4,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),5,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.2. Q Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(10), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);

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
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(10), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			assert.equal(consensusPercent.toNumber(), 10, 'consensusPercent should be 10');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.4. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.5. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(21), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});

		it('1.6. Q Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});

		it('1.7. Q Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.8. T Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

			await voting.vote(true,{from:employee3});
			assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is not finished');
		});

		it('1.9. T Scenario: no yes yes, params(100,20) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			await voting.vote(false,{from:employee3});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is  finished');
		});

		it('1.10. T Scenario: no no no yes yes, params(100,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			await voting.vote(false,{from:employee3});
			await voting.vote(false,{from:employee4});
			await voting.vote(false);

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');

		});

		it('1.11. T Scenario: yes no no yes, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			await voting.vote(false,{from:employee3});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee4});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');
		});

		it('1.12. T Scenario: yes, params(20,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(20), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.13. T Scenario: yes yes no no, params(51,51) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(51), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			await voting.vote(false,{from:employee3});
			await voting.vote(true,{from:employee4});

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is no');

		});

		it('1.14. T Scenario: yes, params(21,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(21), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is no');
		});

		it('1.15. T Scenario: yes no, params(21,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(51), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});

			await increaseTime(3600*1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is no');
		});

		it('1.16. Q Scenario: creator have 11/15 tokens, (50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			await daoBase.issueTokens(token.address, creator, 10);

			let totalSupply = await token.totalSupply();
			assert.equal(totalSupply.toNumber(), 15);
			let creatorBalance = await token.balanceOf(creator);
			assert.equal(creatorBalance.toNumber(), 11);

			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:creator});
			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);

			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),11,'yes');
			assert.equal(r2[1].toNumber(),0,'no');
			assert.equal(r2[2].toNumber(),15,'total');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.17. Q Scenario: creator have 1/15 tokens, employee1 have 10 and vote no, (50,50) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_SIMPLE_TOKEN, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			await daoBase.issueTokens(token.address, employee1, 10);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:creator});

			let totalSupply = await token.totalSupply();
			assert.equal(totalSupply.toNumber(), 15);
			let e1Balance = await token.balanceOf(employee1);
			assert.equal(e1Balance.toNumber(), 11);

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee1});

			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),11,'no');
			assert.equal(r2[2].toNumber(),15,'total');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});
	});

	describe('quadratic voting()', function () {
		beforeEach(async() => {
			token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
			await token.mintFor(creator, 25);
			await token.mintFor(employee1, 11);
			await token.mintFor(employee2, 9);
			await token.mintFor(employee3, 4);
			await token.mintFor(employee4, 16);
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

		it('1.1. Q Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),6,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),8,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),12,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),17,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.2. Q Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(10), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);

			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 10');
			assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100');

			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.3. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,10) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(10), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			assert.equal(consensusPercent.toNumber(), 10, 'consensusPercent should be 10');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),5,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),9,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),14,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.4. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),5,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),9,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),14,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});

		it('1.5. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(21), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),5,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),9,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),14,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});

		it('1.6. Q Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_QUADRATIC, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
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
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),6,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),6,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});
	});

	describe('liquid voting()', function () {
		beforeEach(async() => {
			token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
			await token.mintFor(creator, 1);
			await token.mintFor(employee1, 1);
			await token.mintFor(employee2, 1);
			await token.mintFor(employee3, 1);
			await token.mintFor(employee4, 1);
			// await token.mintFor(employee5, 1);

			let store = await DaoStorage.new([token.address],{ from: creator });
			daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
			moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});
			aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, {from: creator});

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

		it('0. should create new voting', async()=>{
			let isGroupMember = await daoBase.isGroupMember('Employees', employee1);
			assert.equal(isGroupMember,true, 'Creator is ein the group');
			let voting = await Voting.new(daoBase.address, employee1, employee1, VOTING_TYPE_LIQUID, 60, '', 51, 71, token.address);
			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 51, 'quorumPercent should be 51');
			assert.equal(consensusPercent.toNumber(), 71, 'consensusPercent should be 51');
		});

		it('1.1. Q Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),4,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),5,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.2. Q Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(10), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);

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
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(10), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			assert.equal(consensusPercent.toNumber(), 10, 'consensusPercent should be 10');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.4. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.5. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(21), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});

		it('1.6. Q Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});

		it('1.7. Q Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.8. T Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

			await voting.vote(true,{from:employee3});
			assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

			await increaseTime(3600 * 225 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is not finished');
		});

		it('1.9. T Scenario: no yes yes, params(100,20) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			await voting.vote(false,{from:employee3});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is  finished');
		});

		it('1.10. T Scenario: no no no yes yes, params(100,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			await voting.vote(false,{from:employee3});
			await voting.vote(false,{from:employee4});
			await voting.vote(false);

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');

		});

		it('1.11. T Scenario: yes no no yes, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			await voting.vote(false,{from:employee3});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee4});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');
		});

		it('1.12. T Scenario: yes, params(20,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(20), UintToToBytes32(20), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.13. T Scenario: yes yes no no, params(51,51) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(51), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			await voting.vote(false,{from:employee3});
			await voting.vote(true,{from:employee4});

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is no');

		});

		it('1.14. T Scenario: yes, params(21,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(21), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is no');
		});

		it('1.15. T Scenario: yes no, params(21,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(60), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(51), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});

			await increaseTime(3600 * 25 * 1000);

			assert.strictEqual(await voting.isFinished(),true,'Voting is finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is no');
		});

		it('1.16. Q Scenario: creator have 11/15 tokens, (50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			await daoBase.issueTokens(token.address, creator, 10);

			let totalSupply = await token.totalSupply();
			assert.equal(totalSupply.toNumber(), 15);
			let creatorBalance = await token.balanceOf(creator);
			assert.equal(creatorBalance.toNumber(), 11);

			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:creator});
			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);

			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),11,'yes');
			assert.equal(r2[1].toNumber(),0,'no');
			assert.equal(r2[2].toNumber(),15,'total');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		});

		it('1.17. Q Scenario: creator have 1/15 tokens, employee1 have 10 and vote no, (50,50) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), addressToBytes32(token.address));
			await daoBase.issueTokens(token.address, employee1, 10);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:creator});

			let totalSupply = await token.totalSupply();
			assert.equal(totalSupply.toNumber(), 15);
			let e1Balance = await token.balanceOf(employee1);
			assert.equal(e1Balance.toNumber(), 11);

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee1});

			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),11,'no');
			assert.equal(r2[2].toNumber(),15,'total');

			assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		});
	});

	describe('1p1v voting()', function () {
		beforeEach(async() => {
			token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
			await token.mintFor(creator, 1000);

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
			let voting = await Voting.new(daoBase.address, employee1, employee1,VOTING_TYPE_1P1V,  60, "Employees", 51, 71, token.address);
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
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_1P1V, 0, "Employees", 51, 90, token.address);

			// vote by first, check results  (getVotingStats, isFinished, isYes, etc)
			await voting.vote(true,{from:employee1});

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

			await voting.vote(true,{from:employee2});

			var r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
			assert.equal(r2[1].toNumber(),0,'no');

			await voting.vote(true, {from: employee2}).should.be.rejectedWith('revert');

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee3});

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished: 4/6 voted');
			assert.strictEqual(isY,true,'Voting is finished: 4/6 voted, all said yes');
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

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished: 4/6 voted');
			assert.strictEqual(isY,true,'Voting is finished: 4/6 voted, all said yes');
		});

		it('1.1. Q Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(100), 0);

			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();

			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),3,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),4,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(true);
			r2 = await voting.getVotingStats();
			assert.equal(r2
				[0].toNumber(),5,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.2. Q Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(10), UintToToBytes32(100), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);

			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 10');
			assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100');

			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.3. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,10) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(10), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			let quorumPercent = await voting.quorumPercent();
			let consensusPercent = await voting.consensusPercent();
			assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			assert.equal(consensusPercent.toNumber(), 10, 'consensusPercent should be 10');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.4. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.5. Q Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(21), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee4});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),3,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),4,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,false,'Voting is finished');
		});

		it('1.6. Q Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),1,'yes');
			assert.equal(r2[1].toNumber(),2,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,false,'Voting is finished');
		});

		it('1.7. Q Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),0,'no');

			assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is finished');

			await voting.vote(false,{from:employee3});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			assert.equal(r2[1].toNumber(),1,'no');

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should be finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.8. T Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

			await voting.vote(true,{from:employee3});
			assert.strictEqual(await voting.isFinished(),false,'Voting should not be finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is not finished');

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting should not be finished');
			assert.strictEqual(isY,true,'Voting is not finished');
		});

		it('1.9. T Scenario: no yes yes, params(100,20) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			await voting.vote(false,{from:employee3});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is finished');
			assert.strictEqual(isY,false,'Voting is  finished');
		});

		it('1.10. T Scenario: no no no yes yes, params(100,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(100), UintToToBytes32(20), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee2});
			await voting.vote(false,{from:employee3});
			await voting.vote(false,{from:employee4});
			await voting.vote(false);

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.11. T Scenario: yes no no yes, params(50,50) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(50), UintToToBytes32(50), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,false,'Voting is still not finished');
			assert.strictEqual(isY,false,'Voting is still not finished');


			await voting.vote(false,{from:employee2});
			await voting.vote(false,{from:employee3});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(true,{from:employee4});

			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is still not finished');
			assert.strictEqual(isY,true,'Voting is still not finished');
		});

		it('1.12. T Scenario: yes, params(20,20) => isYes==true',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(20), UintToToBytes32(20), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is finished');
			assert.strictEqual(isY,true,'Voting is finished');
		});

		it('1.13. T Scenario: yes yes no no, params(51,51) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(51), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});
			await voting.vote(false,{from:employee3});
			await voting.vote(true,{from:employee4});

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is finished');
			assert.strictEqual(isY,false,'Voting is no');
		});

		it('1.14. T Scenario: yes, params(21,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(21), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is finished');
			assert.strictEqual(isY,false,'Voting is no');
		});

		it('1.15. T Scenario: yes no, params(21,21) => isYes==false',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_1P1V, UintToToBytes32(59), fromUtf8("Employees"), UintToToBytes32(21), UintToToBytes32(51), 0);
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await Voting.at(votingAddress);
			assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
			assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

			await voting.vote(false,{from:employee2});

			await increaseTime(3600*1000);

			var fin = await voting.isFinished();
			var isY = await voting.isYes();
			assert.strictEqual(fin,true,'Voting is finished');
			assert.strictEqual(isY,false,'Voting is no');
		});
	});
	describe('3 votings()', function () {
		beforeEach(async() => {
			token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
			await token.mintFor(creator, 1);
			await token.mintFor(employee1, 1);
			await token.mintFor(employee2, 2);

			let store = await DaoStorage.new([token.address],{ from: creator });
			daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		});

		it('Shoud return right value when 3 different votings created',async() => {
			let simpleVoting = await Voting.new(daoBase.address, employee1, employee1, VOTING_TYPE_SIMPLE_TOKEN, 60, '', 51, 71, token.address);
			let qudraticVoting = await Voting.new(daoBase.address, employee1, employee1, VOTING_TYPE_QUADRATIC, 60, '', 51, 71, token.address);

			r2 = await simpleVoting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await simpleVoting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await simpleVoting.getPowerOf(employee2);
			assert.equal(r2.toNumber(),2,'yes');

			r2 = await qudraticVoting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await qudraticVoting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await qudraticVoting.getPowerOf(employee2);
			assert.equal(r2.toNumber(),1,'yes');

			token.transfer(creator, 1, {from: employee2});
			token.transfer(employee2, 1, {from: employee1});

			r2 = await simpleVoting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await simpleVoting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await simpleVoting.getPowerOf(employee2);
			assert.equal(r2.toNumber(),2,'yes');

			r2 = await qudraticVoting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await qudraticVoting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await qudraticVoting.getPowerOf(employee2);
			assert.equal(r2.toNumber(),1,'yes');
		});
	});
});
