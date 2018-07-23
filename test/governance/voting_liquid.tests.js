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

async function increaseTime(time){
	await web3.currentProvider.sendAsync({
		jsonrpc: '2.0', 
		method: 'evm_increaseTime', 
		params: [time], 
		id: new Date().getSeconds()
	}, async (err, resp) => {
		if (err){
			console.log(err);
		}
	})
}

async function increaseTimeRepeated(time){
	await increaseTime(3600*1000);
	await increaseTime(3600*1000);
	await increaseTime(3600*1000);
	await increaseTime(3600*1000);
	await increaseTime(3600*1000);
	await increaseTime(3600*1000);
	await increaseTime(3600*1000);
}


contract('Voting liquid', (accounts) => {
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
		it('Check getPower()',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);
			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');
		});

		it('Check getPower() when voice delegated',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			await voting.delegateMyVoiceTo(employee1, 1);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');
		});

		it('Check getPower() when voice delegated and delegation removed',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			await voting.delegateMyVoiceTo(employee1, 1);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');

			await voting.removeDelegation(employee1);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');
			r2 = await voting.getDelegatedPowerOf(employee1);
			assert.equal(r2.toNumber(),0,'yes');
		});
	});

	describe('getDelegatedPowerOf()', function () {
		it('Check getDelegatedPowerOf()',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),0,'yes');

			await voting.delegateMyVoiceTo(creator, 1, {from: employee1});

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');
		});
	});

	describe('getDelegatedPowerByMe()', function () {
		it('Check getDelegatedPowerByMe()',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			r2 = await voting.getDelegatedPowerByMe(creator);
			assert.equal(r2.toNumber(),0,'yes');

			await voting.delegateMyVoiceTo(employee1, 1, {from: creator});

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedPowerByMe(employee1);
			assert.equal(r2.toNumber(),1,'yes');
		});
	});

	describe('delegateMyVoiceTo()', function () {
		it('Should delegate from A to B',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),0);

			await voting.delegateMyVoiceTo(creator, 1, {from: employee1});

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),1);
		});

		it('Should delegate from A to B then from A to B again with the same amount',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),0);

			await voting.delegateMyVoiceTo(creator, 1, {from: employee2});

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),1);

			await voting.delegateMyVoiceTo(creator, 1, {from: employee2});

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),1);
		});
	});

	describe('removeDelegation()', function () {
		it('Check removeDelegation()',async() => {
			const voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),0);

			await voting.delegateMyVoiceTo(creator, 1, {from: employee1});

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),1);

			await voting.removeDelegation(creator, {from: employee1});

			r2 = await voting.getDelegatedPowerOf(creator);
			assert.equal(r2.toNumber(),0);
		});
	});
});
