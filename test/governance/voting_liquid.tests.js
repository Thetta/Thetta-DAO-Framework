var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var InformalProposal = artifacts.require("./InformalProposal");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var InformalProposal = artifacts.require("./InformalProposal");

var LiquidVoting = artifacts.require("./LiquidVoting");
var IProposal = artifacts.require("./IProposal");

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('LiquidVoting(quorumPercent, consensusPercent)', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];

	let r2;
	let token;
	let voting;
	let daoBase;

	const VOTING_TYPE_LIQUID = 4;

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 1);
		await token.mintFor(employee1, 1);
		await token.mintFor(employee2, 2);

		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });

	});
	describe('getPowerOf()', function () {
		it('Check getPower()',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			r2 = await voting.getPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1,'yes');
		});

		it('Check getPower() when voice delegated',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			await voting.delegateMyVoiceTo(employee1, 1, votingID);

			r2 = await voting.getPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),1,'yes');
		});

		it('Check getPower() when voice delegated and delegation removed',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			await voting.delegateMyVoiceTo(employee1, 1, votingID);

			r2 = await voting.getPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),1,'yes');

			await voting.removeDelegation(employee1, votingID);

			r2 = await voting.getPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1,'yes');
			r2 = await voting.getPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),1,'yes');
			r2 = await voting.getDelegatedPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),0,'yes');
		});
	});

	describe('getDelegatedPowerOf()', function () {
		it('Check getDelegatedPowerOf()',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0,'yes');

			await voting.delegateMyVoiceTo(creator, 1, votingID, {from: employee1});

			r2 = await voting.getPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1,'yes');
		});
	});

	describe('getDelegatedPowerByMe()', function () {
		it('Check getDelegatedPowerByMe()',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			r2 = await voting.getDelegatedPowerByMe(creator, votingID);
			assert.equal(r2.toNumber(),0,'yes');

			await voting.delegateMyVoiceTo(employee1, 1, votingID, {from: creator});

			r2 = await voting.getPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1, votingID);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedPowerByMe(employee1, votingID);
			assert.equal(r2.toNumber(),1,'yes');
		});
	});

	describe('delegateMyVoiceTo()', function () {
		it('Should delegate from A to B',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0);

			await voting.delegateMyVoiceTo(creator, 1, votingID, {from: employee1});

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1);
		});

		it('Should delegate from A to B then from A to B again with the same amount',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0);

			await voting.delegateMyVoiceTo(creator, 1, votingID, {from: employee2});

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1);

			await voting.delegateMyVoiceTo(creator, 1, votingID, {from: employee2});

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1);
		});
	});

	describe('removeDelegation()', function () {
		it('Check removeDelegation()',async() => {
			const voting = await LiquidVoting.new(daoBase.address, creator, creator, 0, 100, 100, token.address, false);

			const tx = await voting.startNewVoting();
			const events = tx.logs.filter(l => l.event == 'VotingStarted');
			const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0,);

			await voting.delegateMyVoiceTo(creator, 1, votingID, {from: employee1});

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),1,);

			await voting.removeDelegation(creator, votingID, {from: employee1});

			r2 = await voting.getDelegatedPowerOf(creator, votingID);
			assert.equal(r2.toNumber(),0,);
		});
	});
});
