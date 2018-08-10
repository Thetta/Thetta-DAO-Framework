var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var Voting = artifacts.require("./Voting");
var GenericProposal = artifacts.require("./GenericProposal");
var InformalProposal = artifacts.require("./InformalProposal");

const BigNumber = web3.BigNumber;

const VOTING_TYPE_1P1V = 1;
const VOTING_TYPE_SIMPLE_TOKEN = 2;
const VOTING_TYPE_QUADRATIC = 3;
const VOTING_TYPE_LIQUID = 4;

function KECCAK256 (x){
	return web3.sha3(x);
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('GenericProposal', (accounts) => {
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
	let voting;
	let issueTokens;
	let store;

	let money = web3.toWei(0.001, "ether");

	beforeEach(async() => {
		token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
		await token.mintFor(creator, 1);
		let store = await DaoStorage.new([token.address], { from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address, { from: creator });	
	});

	describe('setVoting()', function () {
		it('should revert when not owner call',async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
			await proposal.setVoting(voting.address, {from: employee1}).should.be.rejectedWith('revert');
		});

		it('should set voting',async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
			await proposal.setVoting(voting.address);
			assert.equal(await proposal.getVoting(), voting.address, 'address should be the same');
		});
	});

	describe('getVoting()', function () {
		it('should get voting 0x0 when it is not setted',async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			assert.equal(await proposal.getVoting(), 0x0, 'address should be the same');
		});

		it('should get voting',async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
			await proposal.setVoting(voting.address);
			assert.equal(await proposal.getVoting(), voting.address, 'address should be the same');
		});
	});

	describe('action()', function () {
		it('should revert when call is not from voting',async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
			await proposal.setVoting(voting.address);
			await proposal.action().should.be.rejectedWith('revert');
		});

		it('should call action success',async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			await proposal.action();
		});
	});

	describe('getMethodSig()', () => {
		it('should return method signature', async() => {
			proposal = await GenericProposal.new(creator, creator, 'ANY_SIGNATURE', []);
			const sign = await proposal.getMethodSig();
			assert.equal(sign, 'ANY_SIGNATURE');
		});
	});

	describe('getParams()', () => {
		it('should return method params', async() => {
			proposal = await GenericProposal.new(creator, creator, '', []);
			const params = await proposal.getParams();
			assert.equal(params.length, 0);
		});
	});
});