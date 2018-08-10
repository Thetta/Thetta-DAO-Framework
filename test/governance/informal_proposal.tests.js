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

contract('InformalProposal', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];

	let proposal;
	let proposalText = "Test";

	beforeEach(async() => {
		token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
		await token.mintFor(creator, 1);
		// let store = await DaoStorage.new([token.address], { from: creator });
		daoBase = await DaoBaseWithUnpackers.new([token.address], { from: creator });
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

