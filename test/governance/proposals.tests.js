var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var Voting = artifacts.require("./Voting");
var Genericproposal = artifacts.require("./GenericProposal");
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

	let money = web3.toWei(0.001, "ether");

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		proposal = await Genericproposal.new(daoBase.address, creator, 'issueTokensGeneric(bytes32[])', [token.address, employee1, 10]);
		voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
	});

	describe('setVoting()', function () {
		it('should revert when not owner call',async() => {
			await proposal.setVoting(voting.address, {from: employee1}).should.be.rejectedWith('revert');
		});

		it('should set voting',async() => {
			await proposal.setVoting(voting.address);
			assert.equal(await proposal.getVoting(), voting.address, 'address should be the same');
		});
	});

	describe('getVoting()', function () {
		it('should get voting 0x0 when it is not setted',async() => {
			assert.equal(await proposal.getVoting(), 0x0, 'address should be the same');
		});

		it('should get voting',async() => {
			await proposal.setVoting(voting.address);
			assert.equal(await proposal.getVoting(), voting.address, 'address should be the same');
		});
	});

	describe('action()', function () {
		it('should revert when call is not from voting',async() => {
			await proposal.setVoting(voting.address);
			await proposal.action().should.be.rejectedWith('revert');
		});

		it('should call action success',async() => {
			await proposal.action();
		});
	});
});

contract('InformalProposal', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];

	let proposal;
	let proposalText = "Test";

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		proposal = await InformalProposal.new(proposalText);
		voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
	});

	describe('getProposalText()', function () {
		it('should return correct value',async() => {
			assert.equal(await proposal.getProposalText(), proposalText, 'proposal text should be the same');
		});
	});

	describe('setVoting()', function () {
		it('should revert when not owner call',async() => {
			await proposal.setVoting(voting.address, {from: employee1}).should.be.rejectedWith('revert');
		});

		it('should set voting',async() => {
			await proposal.setVoting(voting.address);
		});
	});

	describe('getVoting()', function () {
		it('should get voting 0x0 when it is not setted',async() => {
			assert.equal(await proposal.getVoting(), 0x0, 'address should be the same');
		});

		it('should get voting',async() => {
			await proposal.setVoting(voting.address);
			assert.equal(await proposal.getVoting(), voting.address, 'address should be the same');
		});
	});

	describe('action()', function () {
		it('should call action success',async() => {
			await proposal.action();
		});
	});
 });

