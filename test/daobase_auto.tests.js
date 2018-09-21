const assert = require('chai').assert;

const { uintToBytes32, fromUtf8, padToBytes32 } = require('./utils/helpers');

const DaoBaseAuto = artifacts.require("DaoBaseAuto");
const DaoBaseWithUnpackers = artifacts.require("DaoBaseWithUnpackers");
const DaoStorage = artifacts.require("DaoStorage");
const GenericProposal = artifacts.require("GenericProposal");
const StdDaoToken = artifacts.require("StdDaoToken");

contract('DaoBaseAuto', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider1 = accounts[3];

	let daoBase
	let daoBaseAuto;
	let store;
	let token;

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken" ,"STDT", 18, true, true, 100 * 10^18, {from: creator});
		await token.mintFor(creator, 1);
		await token.mintFor(employee1, 1);
		await token.mintFor(employee2, 1);

		store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address, {from: creator});
		daoBaseAuto = await DaoBaseAuto.new(daoBase.address, {from: creator});
		const MANAGE_GROUPS = await daoBase.MANAGE_GROUPS();

		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);
		const VOTING_TYPE_1P1V = 1;
		await daoBaseAuto.setVotingParams(await daoBase.MANAGE_GROUPS(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.ISSUE_TOKENS(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.UPGRADE_DAO_CONTRACT(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.REMOVE_GROUP_MEMBER(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.ALLOW_ACTION_BY_SHAREHOLDER(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.ALLOW_ACTION_BY_VOTING(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.ALLOW_ACTION_BY_ADDRESS(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);
		await daoBaseAuto.setVotingParams(await daoBase.ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP(), VOTING_TYPE_1P1V, uintToBytes32(0), fromUtf8("Employees"), uintToBytes32(51), uintToBytes32(51), 0);

		await daoBase.allowActionByAddress(await daoBase.ADD_NEW_PROPOSAL(), daoBaseAuto.address);

		await daoBase.addGroupMember('Employees', creator);
		await daoBase.addGroupMember('Employees', employee1);
		await daoBase.addGroupMember('Employees', employee2);

		await daoBase.renounceOwnership();
	});

	describe('addGroupMemberAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.addGroupMemberAuto('', employee1, {from: employee1}).should.be.rejectedWith('revert'); // empty string is not ok
			await daoBaseAuto.addGroupMemberAuto('ANY_GROUP', employee1, {from: employee1}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// employee1 creates a proposal
			await daoBaseAuto.addGroupMemberAuto('Employees', outsider1, {from: employee1}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();

			assert.equal(params[0], fromUtf8('Employees'));
			assert.equal(params[1], padToBytes32(outsider1, 'left'))
		});
	});

	describe('issueTokensAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.issueTokensAuto(token.address, employee1, 1, {from: employee1}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// employee1 creates a proposal
			await daoBaseAuto.issueTokensAuto(token.address, employee1, 1, {from: employee1}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], padToBytes32(token.address, 'left'));
			assert.equal(params[1], padToBytes32(employee1, 'left'));
			assert.equal(params[2], uintToBytes32(1));
		});
	});

	describe('upgradeDaoContractAuto()', () => {
		it('should return a proposal', async() => {
			const newDaoBase = await DaoBaseWithUnpackers.new([token.address], {from: creator});
			await daoBaseAuto.upgradeDaoContractAuto(newDaoBase.address, {from: employee1}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// creator creates a proposal
			const newDaoBase = await DaoBaseWithUnpackers.new([token.address], {from: creator});
			await daoBaseAuto.upgradeDaoContractAuto(newDaoBase.address, {from: employee1}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], padToBytes32(newDaoBase.address, 'left'));
		});
	});

	describe('removeGroupMemberAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.removeGroupMemberAuto('Employees', employee1, {from: creator}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// creator creates a proposal
			await daoBaseAuto.removeGroupMemberAuto('Employees', employee1, {from: creator}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], fromUtf8('Employees'));
			assert.equal(params[1], padToBytes32(employee1, 'left'));
		});
	});

	describe('allowActionByShareholderAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.allowActionByShareholderAuto('ANY_ACTION', employee1, {from: creator}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// creator creates a proposal
			await daoBaseAuto.allowActionByShareholderAuto('ANY_ACTION', employee1, {from: creator}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], fromUtf8('ANY_ACTION'));
			assert.equal(params[1], padToBytes32(employee1, 'left'));
		});
	});

	describe('allowActionByVotingAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.allowActionByVotingAuto('ANY_ACTION', employee1, {from: creator}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// creator creates a proposal
			await daoBaseAuto.allowActionByVotingAuto('ANY_ACTION', employee1, {from: creator}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], fromUtf8('ANY_ACTION'));
			assert.equal(params[1], padToBytes32(employee1, 'left'));
		});
	});

	describe('allowActionByAddressAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.allowActionByAddressAuto('ANY_ACTION', employee1, {from: creator}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// creator creates a proposal
			await daoBaseAuto.allowActionByAddressAuto('ANY_ACTION', employee1, {from: creator}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], fromUtf8('ANY_ACTION'));
			assert.equal(params[1], padToBytes32(employee1, 'left'));
		});
	});

	describe('allowActionByAnyMemberOfGroupAuto()', () => {
		it('should return a proposal', async() => {
			await daoBaseAuto.allowActionByAnyMemberOfGroupAuto('ANY_ACTION', 'ANY_GROUP', {from: creator}).should.be.fulfilled;
			assert.exists(await daoBase.getProposalAtIndex(0));
		});

		it('should pack params', async() => {
			// creator creates a proposal
			await daoBaseAuto.allowActionByAnyMemberOfGroupAuto('ANY_ACTION', 'ANY_GROUP', {from: creator}).should.be.fulfilled;
			// get proposal params
			const proposalAddr = await daoBase.getProposalAtIndex(0);
			const proposal = GenericProposal.at(proposalAddr);
			const params = await proposal.getParams();
			
			assert.equal(params[0], fromUtf8('ANY_ACTION'));
			assert.equal(params[1], fromUtf8('ANY_GROUP'));
		});
	});
});