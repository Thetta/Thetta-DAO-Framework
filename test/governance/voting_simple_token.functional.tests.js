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

var Voting = artifacts.require("./Voting");
var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

const BigNumber = web3.BigNumber;

const VOTING_TYPE_1P1V = 1;
const VOTING_TYPE_SIMPLE_TOKEN = 2;
const VOTING_TYPE_QUADRATIC = 3;
const VOTING_TYPE_LIQUID = 4;


require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Multiple Votings', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];

	let r2;
	let token;
	let voting;
	let daoBase;

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 1);
		await token.mintFor(employee1, 1);
		await token.mintFor(employee2, 2);

		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });

	});
	describe('getPowerOf()', function () {
		it('Check getPower() when 3 different votings created',async() => {

			let liquidVoting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);
			let simpleVoting = await Voting.new(daoBase.address, employee1, employee1, VOTING_TYPE_SIMPLE_TOKEN, 60, '', 51, 71, token.address);
			let qudraticVoting = await Voting.new(daoBase.address, employee1, employee1, VOTING_TYPE_QUADRATIC, 60, '', 51, 71, token.address);

			let tx = await token.startNewVoting(liquidVoting.address);
			let events = tx.logs.filter(l => l.event == 'VotingStarted');
			let votingID = events.filter(e => e.args._address == creator)[0].args._votingID;
			await liquidVoting.setStdDaoTokenVotingID(votingID);

			tx = await token.startNewVoting(simpleVoting.address);
			events = tx.logs.filter(l => l.event == 'VotingStarted');
			votingID = events.filter(e => e.args._address == creator)[0].args._votingID;
			await simpleVoting.setStdDaoTokenVotingID(votingID);

			tx = await token.startNewVoting(qudraticVoting.address);
			events = tx.logs.filter(l => l.event == 'VotingStarted');
			votingID = events.filter(e => e.args._address == creator)[0].args._votingID;
			await qudraticVoting.setStdDaoTokenVotingID(votingID);

			r2 = await liquidVoting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await liquidVoting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await liquidVoting.getPowerOf(employee2);
			assert.equal(r2.toNumber(),2,'yes');

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

			r2 = await liquidVoting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await liquidVoting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			r2 = await liquidVoting.getPowerOf(employee2);
			assert.equal(r2.toNumber(),2,'yes');

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
