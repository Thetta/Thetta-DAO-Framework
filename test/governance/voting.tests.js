var DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');
var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');

var Voting = artifacts.require('./Voting');
var GenericProposal = artifacts.require('./GenericProposal');

const BigNumber = web3.BigNumber;

const VOTING_TYPE_1P1V = 1;
const VOTING_TYPE_SIMPLE_TOKEN = 2;
const VOTING_TYPE_QUADRATIC = 3;
const VOTING_TYPE_LIQUID = 4;

var increaseTime = require('../utils/increaseTime');

function KECCAK256 (x) {
	return web3.sha3(x);
}

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	.should();

contract('Voting', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const employee5 = accounts[5];

	let r2;
	let token;
	let daoBase;
	let store;
	let proposal;
	let voting;
	let manageGroups;

	describe('simple voting()', function () {
		beforeEach(async () => {
			token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
			await token.mintFor(creator, 1);
			await token.mintFor(employee1, 1);
			await token.mintFor(employee2, 2);

			store = await DaoStorage.new([token.address],{from: creator});
			daoBase = await DaoBaseWithUnpackers.new(store.address);
			proposal = await GenericProposal.new(creator, creator, '', []);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 100, token.address);
		
			await store.transferOwnership(daoBase.address);
	});

		describe('quorumPercent()', function () {
			it('should return correct value', async () => {
				let quorumPercent = await voting.quorumPercent();
				assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			});
		});

		describe('consensusPercent()', function () {
			it('should return correct value', async () => {
				let consensusPercent = await voting.consensusPercent();
				assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100');
			});
		});

		describe('groupName()', function () {
			it('should return correct value', async () => {
				r2 = await voting.groupName();
				assert.equal(r2, 'Test', 'group name');
			});
		});

		describe('getVotersTotal()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getVotersTotal();
				assert.equal(r2.toNumber(), 4, 'yes');
			});
		});

		describe('getPowerOf()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 1, 'yes');
			});
		});
		// from here
		describe('vote()', function () {
			it('Should revert when voting is finished()', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 4, 'yes');
				assert.equal(await voting.isFinished(), true, 'yes');
				await voting.vote(true, { from: employee3 }).should.be.rejectedWith('revert');
			});

			it('Should revert when account already voted', async () => {
				await voting.vote(true).should.be.rejectedWith('revert');
			});

			it('Should pass()', async () => {
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 1, 'yes');
			});
		});

		describe('isFinished()', function () {
			it('Should return true due to voting cancelled', async () => {
				r2 = await voting.cancelVoting();
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to voting finishedWithYes = true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to time elapsed', async () => {
				voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 60, 'Test', 100, 100, token.address);
				await increaseTime(36000 * 1000);
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to quorum reached', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isFinished(), true, 'finished');
			});
		});

		describe('isYes()', function () {
			it('Should return false due to voting cancelled', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.cancelVoting();
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to voting not finished yet', async () => {
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isFinished(), false, 'false');
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to quorum not reached', async () => {
				voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 70, 100, token.address);
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to consensus not reached', async () => {
				voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_SIMPLE_TOKEN, 0, 'Test', 100, 70, token.address);
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return true due to voting finishedWithYes = true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				let tx = await voting.callActionIfEnded();
				let events = tx.logs.filter(l => l.event === 'CallAction');
				assert.notEqual(events, undefined);
				assert.equal(await voting.isYes(), true, 'yes');
			});

			it('Should return true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isYes(), true, 'yes');
			});
		});

		describe('getVotingStats()', function () {
			it('Should pass', async () => {
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 1, 'yes');
				await voting.vote(false, { from: employee1 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[1].toNumber(), 1, 'no');
				await voting.vote(false, { from: employee2 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[1].toNumber(), 3, 'no');
			});
		});

		describe('cancelVoting()', function () {
			it('should revert due to not owner call', async () => {
				await voting.cancelVoting({ from: employee1 }).should.be.rejectedWith('revert');
			});

			it('should pass', async () => {
				await voting.cancelVoting();
			});
		});
	});

	describe('liquid voting()', function () {
		beforeEach(async () => {
			token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
			await token.mintFor(creator, 1);
			await token.mintFor(employee1, 1);
			await token.mintFor(employee2, 2);

			store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address);
			voting = await Voting.new(daoBase.address, creator, creator, VOTING_TYPE_LIQUID, 0, '', 100, 100, token.address);
		
		await store.transferOwnership(daoBase.address);
	});

		describe('getPowerOf()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 1, 'yes');
			});

			it('should return correct value when voice delegated', async () => {
				await voting.delegateMyVoiceTo(employee1, 1);

				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 0, 'yes');
				r2 = await voting.getPowerOf(employee1);
				assert.equal(r2.toNumber(), 2, 'yes');
				r2 = await voting.getDelegatedPowerOf(employee1);
				assert.equal(r2.toNumber(), 1, 'yes');
			});

			it('should return correct value when voice delegated and delegation removed', async () => {
				await voting.delegateMyVoiceTo(employee1, 1);

				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 0, 'yes');
				r2 = await voting.getPowerOf(employee1);
				assert.equal(r2.toNumber(), 2, 'yes');
				r2 = await voting.getDelegatedPowerOf(employee1);
				assert.equal(r2.toNumber(), 1, 'yes');

				await voting.removeDelegation(employee1);

				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 1, 'yes');
				r2 = await voting.getPowerOf(employee1);
				assert.equal(r2.toNumber(), 1, 'yes');
				r2 = await voting.getDelegatedPowerOf(employee1);
				assert.equal(r2.toNumber(), 0, 'yes');
			});
		});

		describe('getDelegatedPowerOf()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 0, 'yes');

				await voting.delegateMyVoiceTo(creator, 1, { from: employee1 });

				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 2, 'yes');
				r2 = await voting.getPowerOf(employee1);
				assert.equal(r2.toNumber(), 0, 'yes');
				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 1, 'yes');
			});
		});

		describe('getDelegatedPowerByMe()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getDelegatedPowerByMe(creator);
				assert.equal(r2.toNumber(), 0, 'yes');

				await voting.delegateMyVoiceTo(employee1, 1, { from: creator });

				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 0, 'yes');
				r2 = await voting.getPowerOf(employee1);
				assert.equal(r2.toNumber(), 2, 'yes');
				r2 = await voting.getDelegatedPowerByMe(employee1);
				assert.equal(r2.toNumber(), 1, 'yes');
			});
		});

		describe('delegateMyVoiceTo()', function () {
			it('Should delegate from A to B', async () => {
				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 0);

				await voting.delegateMyVoiceTo(creator, 1, { from: employee1 });

				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 1);
			});

			it('Should delegate from A to B then from A to B again with the same amount', async () => {
				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 0);

				await voting.delegateMyVoiceTo(creator, 1, { from: employee2 });

				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 1);

				await voting.delegateMyVoiceTo(creator, 1, { from: employee2 });

				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 1);
			});
		});

		describe('removeDelegation()', function () {
			it('Should remove delegation and getDelegatedPowerOf() should return correct value', async () => {
				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 0);

				await voting.delegateMyVoiceTo(creator, 1, { from: employee1 });

				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 1);

				await voting.removeDelegation(creator, { from: employee1 });

				r2 = await voting.getDelegatedPowerOf(creator);
				assert.equal(r2.toNumber(), 0);
			});
		});
	});

	describe('quadratic voting()', function () {
		beforeEach(async () => {
			token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
			await token.mintFor(creator, 4);
			await token.mintFor(employee1, 9);
			await token.mintFor(employee2, 11);

			store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address);
			proposal = await GenericProposal.new(creator, creator, '', []);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 0, 'Test', 100, 100, token.address);
		
		await store.transferOwnership(daoBase.address);
	});

		describe('quorumPercent()', function () {
			it('should return correct value', async () => {
				let quorumPercent = await voting.quorumPercent();
				assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			});
		});

		describe('consensusPercent()', function () {
			it('should return correct value', async () => {
				let consensusPercent = await voting.consensusPercent();
				assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100');
			});
		});

		describe('groupName()', function () {
			it('should return correct value', async () => {
				r2 = await voting.groupName();
				assert.equal(r2, 'Test', 'group name');
			});
		});

		describe('getVotersTotal()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getVotersTotal();
				assert.equal(r2.toNumber(), 8, 'yes');
			});
		});

		describe('getPowerOf()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 2, 'yes');
			});
		});

		describe('vote()', function () {
			it('Should revert when voting is finished()', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 8, 'yes');
				assert.equal(await voting.isFinished(), true, 'yes');
				await voting.vote(true, { from: employee3 }).should.be.rejectedWith('revert');
			});

			it('Should revert when account already voted', async () => {
				await voting.vote(true).should.be.rejectedWith('revert');
			});

			it('Should pass()', async () => {
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 2, 'yes');
			});
		});

		describe('isFinished()', function () {
			it('Should return true due to voting cancelled', async () => {
				r2 = await voting.cancelVoting();
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to voting finishedWithYes = true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to time elapsed', async () => {
				let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_QUADRATIC, 60, 'Test', 100, 100, token.address);
				await increaseTime(36000 * 1000);
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to quorum reached', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isFinished(), true, 'finished');
			});
		});

		describe('isYes()', function () {
			it('Should return false due to voting cancelled', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.cancelVoting();
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to voting not finished yet', async () => {
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isFinished(), false, 'false');
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to quorum not reached', async () => {
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to consensus not reached', async () => {
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return true due to voting finishedWithYes = true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				let tx = await voting.callActionIfEnded();
				let events = tx.logs.filter(l => l.event === 'CallAction');
				assert.notEqual(events, undefined);
				assert.equal(await voting.isYes(), true, 'yes');
			});

			it('Should return true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isYes(), true, 'yes');
			});
		});

		describe('getVotingStats()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 2, 'yes');
				await voting.vote(false, { from: employee1 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[1].toNumber(), 3, 'no');
				await voting.vote(false, { from: employee2 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[1].toNumber(), 6, 'no');
			});
		});

		describe('cancelVoting()', function () {
			it('should revert due to not owner call', async () => {
				await voting.cancelVoting({ from: employee1 }).should.be.rejectedWith('revert');
			});

			it('should pass', async () => {
				await voting.cancelVoting();
			});
		});
	});

	describe('Voting_1p1v', function () {
		beforeEach(async () => {
			token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 100);

			store = await DaoStorage.new([token.address],{from: creator});
			daoBase = await DaoBaseWithUnpackers.new(store.address);
			proposal = await GenericProposal.new(creator, creator, '', []);

			manageGroups = await daoBase.MANAGE_GROUPS();

			await store.addGroupMember(web3.sha3('Test'), creator);
			await store.allowActionByAddress(manageGroups, creator);
			

			await store.addGroupMember(web3.sha3('Test'), employee1);
			await store.addGroupMember(web3.sha3('Test'), employee2);
			voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_1P1V, 0, 'Test', 100, 100, token.address);
		
			await store.transferOwnership(daoBase.address);
	});

		describe('quorumPercent()', function () {
			it('should return correct value', async () => {
				let quorumPercent = await voting.quorumPercent();
				assert.equal(quorumPercent.toNumber(), 100, 'quorumPercent should be 100');
			});
		});

		describe('consensusPercent()', function () {
			it('should return correct value', async () => {
				let consensusPercent = await voting.consensusPercent();
				assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100');
			});
		});

		describe('groupName()', function () {
			it('should return correct value', async () => {
				r2 = await voting.groupName();
				assert.equal(r2, 'Test', 'group name');
			});
		});

		describe('getVotersTotal()', function () {
			it('should return correct value', async () => {
				r2 = await voting.getVotersTotal();
				assert.equal(r2.toNumber(), 3, 'yes');
			});
		});

		describe('getPowerOf()', function () {
			it('Should return 0 due to not group member', async () => {
				r2 = await voting.getPowerOf(employee5);
				assert.equal(r2.toNumber(), 0, 'yes');
			});

			it('Should return 1', async () => {
				r2 = await voting.getPowerOf(creator);
				assert.equal(r2.toNumber(), 1, 'yes');
			});
		});
		// from here
		describe('vote()', function () {
			it('Should revert when voting is finished()', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 3, 'yes');
				assert.equal(await voting.isFinished(), true, 'yes');
				await voting.vote(true, { from: employee2 }).should.be.rejectedWith('revert');
			});

			it('Should revert when account already voted', async () => {
				await voting.vote(true).should.be.rejectedWith('revert');
			});

			it('Should pass()', async () => {
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 1, 'yes');
			});
		});

		describe('isFinished()', function () {
			it('Should return true due to voting cancelled', async () => {
				r2 = await voting.cancelVoting();
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to voting finishedWithYes = true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to time elapsed', async () => {
				let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_1P1V, 60, 'Test', 100, 100, token.address);
				await increaseTime(36000 * 1000);
				assert.equal(await voting.isFinished(), true, 'finished');
			});

			it('Should return true due to quorum reached', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isFinished(), true, 'finished');
			});
		});

		describe('isYes()', function () {
			it('Should return false due to voting cancelled', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.cancelVoting();
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to voting not finished yet', async () => {
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isFinished(), false, 'false');
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to quorum not reached', async () => {
				let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_1P1V, 0, 'Test', 70, 100, token.address);
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return false due to consensus not reached', async () => {
				let voting = await Voting.new(daoBase.address, proposal.address, creator, VOTING_TYPE_1P1V, 0, 'Test', 100, 70, token.address);
				await voting.vote(true, { from: employee1 });
				assert.equal(await voting.isYes(), false, 'yes');
			});

			it('Should return true due to voting finishedWithYes = true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isYes(), true, 'yes');
			});

			it('Should return true', async () => {
				await voting.vote(true, { from: employee1 });
				await voting.vote(true, { from: employee2 });
				assert.equal(await voting.isYes(), true, 'yes');
			});
		});

		describe('getVotingStats()', function () {
			it('Should pass', async () => {
				r2 = await voting.getVotingStats();
				assert.equal(r2[0].toNumber(), 1, 'yes');
				await voting.vote(false, { from: employee1 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[1].toNumber(), 1, 'no');
				await voting.vote(false, { from: employee2 });
				r2 = await voting.getVotingStats();
				assert.equal(r2[1].toNumber(), 2, 'no');
			});
		});

		describe('cancelVoting()', function () {
			it('should revert due to not owner call', async () => {
				await voting.cancelVoting({ from: employee1 }).should.be.rejectedWith('revert');
			});

			it('should pass', async () => {
				await voting.cancelVoting();
			});
		});
	});
});
