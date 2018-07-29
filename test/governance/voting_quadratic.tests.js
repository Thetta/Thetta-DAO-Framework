var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var Voting = artifacts.require("./Voting");
var Genericproposal = artifacts.require("./GenericProposal");

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

contract('Voting Quadratic', (accounts) => {
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
	let proposal;

	let money = web3.toWei(0.001, "ether");

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 4);
		await token.mintFor(employee1, 9);
		await token.mintFor(employee2, 11);

		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		proposal = await Genericproposal.new(creator, creator, '', []);
	});

	describe('Voting()', function () {
		it('Check voting creation()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
		});
	});

	describe('quorumPercent()', function () {
		it('Check quorumPercent()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			let quorumPercent = await voting.quorumPercent();
			assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
		});
	});

	describe('consensusPercent()', function () {
		it('Check consensusPercent()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			let consensusPercent = await voting.consensusPercent();
			assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100');
		});
	});

	describe('groupName()', function () {
		it('Check groupName()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			r2 = await voting.groupName();
			assert.equal(r2,'Test','group name');
		});
	});

	describe('getVotersTotal()', function () {
		it('Check getVotersTotal()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			r2 = await voting.getVotersTotal();
			assert.equal(r2.toNumber(),8,'yes');
		});
	});

	describe('getPowerOf()', function () {
		it('Check getPowerOf()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),2,'yes');
		});
	});

	describe('vote()', function () {
		it('Should revert when voting is finished()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			await voting.vote(true, {from: employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),8,'yes');
			assert.equal(await voting.isFinished(),true,'yes');
			await voting.vote(true, {from: employee3}).should.be.rejectedWith('revert');
		});

		it('Should revert when account already voted',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true).should.be.rejectedWith('revert');
		});

		it('Should pass()',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
		});
	});

	describe('isFinished()', function () {
		it('Should return true due to voting cancelled',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			r2 = await voting.cancelVoting();
			assert.equal(await voting.isFinished(),true,'finished');
		});

		it('Should return true due to voting finishedWithYes = true',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			await voting.vote(true, {from: employee2});
			let tx = await voting.callActionIfEnded();
			assert.equal(await voting.isFinished(),true,'finished');
		});

		it('Should return true due to time elapsed',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 60, 'Test', 100, 100, token.address);
			await increaseTime(36000*1000);
			assert.equal(await voting.isFinished(),true,'finished');
		});

		it('Should return true due to quorum reached',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			await voting.vote(true, {from: employee2});
			assert.equal(await voting.isFinished(),true,'finished');
		});
	});

	describe('isYes()', function () {
		it('Should return false due to voting cancelled',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			await voting.cancelVoting();
			assert.equal(await voting.isYes(),false,'yes');
		});

		it('Should return false due to voting not finished yet',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			assert.equal(await voting.isFinished(),false,'false');
			assert.equal(await voting.isYes(),false,'yes');
		});

		it('Should return false due to quorum not reached',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 70, 100, token.address);
			await voting.vote(true, {from: employee1});
			assert.equal(await voting.isYes(),false,'yes');
		});

		it('Should return false due to consensus not reached',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 70, token.address);
			await voting.vote(true, {from: employee1});
			assert.equal(await voting.isYes(),false,'yes');
		});

		it('Should return true due to voting finishedWithYes = true',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			await voting.vote(true, {from: employee2});
			let tx = await voting.callActionIfEnded();
			let events = tx.logs.filter(l => l.event == 'CallAction');
			assert.notEqual(events, undefined);
			assert.equal(await voting.isYes(),true,'yes');
		});

		it('Should return true',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.vote(true, {from: employee1});
			console.log(await voting.isFinished());
			await voting.vote(true, {from: employee2});
			assert.equal(await voting.isYes(),true,'yes');
		});
	});

	describe('getVotingStats()', function () {
		it('Should pass',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			r2 = await voting.getVotingStats();
			assert.equal(r2[0].toNumber(),2,'yes');
			await voting.vote(false, {from: employee1});
			r2 = await voting.getVotingStats();
			assert.equal(r2[1].toNumber(),3,'no');
			await voting.vote(false, {from: employee2});
			r2 = await voting.getVotingStats();
			assert.equal(r2[1].toNumber(),6,'no');
		});
	});

	describe('cancelVoting()', function () {
		it('should revert due to not owner call',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.cancelVoting({from: employee1}).should.be.rejectedWith('revert');
		});

		it('should pass',async() => {
			let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
			await voting.cancelVoting();
		});
	});
});
