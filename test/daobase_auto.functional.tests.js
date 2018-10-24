const assert = require('chai').assert;
const { getVoting, uintToBytes32, fromUtf8 } = require('./utils/helpers');

const DaoBaseAuto = artifacts.require("DaoBaseAuto");
const DaoBaseWithUnpackers = artifacts.require("DaoBaseWithUnpackers");
const DaoStorage = artifacts.require("DaoStorage");
const StdDaoToken = artifacts.require("StdDaoToken");

contract('DaoBaseAuto', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider1 = accounts[3];

	let daoBase;
	let daoBaseAuto;
	let store;
	let token;

    beforeEach(async() => {
		token = await StdDaoToken.new("StdToken" ,"STDT", 18, true, true, 100 * 10^18, {from: creator});
		await token.mintFor(outsider1, 1);

		store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address, {from: creator});
		daoBaseAuto = await DaoBaseAuto.new(daoBase.address, {from: creator});

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

		await daoBase.allowActionByVoting(await daoBase.MANAGE_GROUPS(), token.address);
		await daoBase.allowActionByVoting(await daoBase.ISSUE_TOKENS(), token.address);
		await daoBase.allowActionByVoting(await daoBase.UPGRADE_DAO_CONTRACT(), token.address);
		await daoBase.allowActionByVoting(await daoBase.REMOVE_GROUP_MEMBER(), token.address);
		await daoBase.allowActionByVoting(await daoBase.ALLOW_ACTION_BY_SHAREHOLDER(), token.address);
		await daoBase.allowActionByVoting(await daoBase.ALLOW_ACTION_BY_VOTING(), token.address);
		await daoBase.allowActionByVoting(await daoBase.ALLOW_ACTION_BY_ADDRESS(), token.address);
		await daoBase.allowActionByVoting(await daoBase.ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP(), token.address);

		await daoBase.allowActionByAddress(await daoBase.ADD_NEW_PROPOSAL(), daoBaseAuto.address);

		await daoBase.addGroupMember('Employees', creator);
		await daoBase.addGroupMember('Employees', employee1);
		await daoBase.addGroupMember('Employees', employee2);

		await daoBase.renounceOwnership();
	});

	describe('addGroupMemberAuto()', () => {
		it('should add a new group member in case of successful voting', async() => {
			await daoBaseAuto.addGroupMemberAuto('Employees', outsider1, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const membersBefore = await daoBase.getGroupMembers("Employees");
			assert.equal(membersBefore.length, 3);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const membersAfter = await daoBase.getGroupMembers("Employees");
			assert.equal(membersAfter.length, 4);
			assert.equal(membersAfter[3], outsider1);
		});

		it('should not add a new group member in case of failed voting', async() => {
			await daoBaseAuto.addGroupMemberAuto('Employees', outsider1, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const membersBefore = await daoBase.getGroupMembers("Employees");
			assert.equal(membersBefore.length, 3);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const membersAfter = await daoBase.getGroupMembers("Employees");
			assert.equal(membersAfter.length, 3);
		});
	});

	describe('allowActionByAddressAuto()', () => {
		it('should allow action by address in case of successful voting', async() => {
			await daoBaseAuto.allowActionByAddressAuto('ANY_ACTION', outsider1, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBefore = await store.isAllowedActionByAddress('ANY_ACTION', outsider1);
			assert.equal(isAllowedBefore, false);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const isAllowedAfter = await store.isAllowedActionByAddress('ANY_ACTION', outsider1);
			assert.equal(isAllowedAfter, true);
		});

		it('should not allow action by address in case of failed voting', async() => {
			await daoBaseAuto.allowActionByAddressAuto('ANY_ACTION', outsider1, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBefore = await store.isAllowedActionByAddress('ANY_ACTION', outsider1);
			assert.equal(isAllowedBefore, false);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const isAllowedAfter = await store.isAllowedActionByAddress('ANY_ACTION', outsider1);
			assert.equal(isAllowedAfter, false);
		});
	});

	describe('allowActionByAnyMemberOfGroupAuto()', () => {
		it('should allow action by any member of group in case of successful voting', async() => {
			await daoBaseAuto.allowActionByAnyMemberOfGroupAuto('ANY_ACTION', 'Employees', {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBefore = await store.isAllowedActionByMembership('ANY_ACTION', employee1);
			assert.equal(isAllowedBefore, false);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const isAllowedAfter = await store.isAllowedActionByMembership('ANY_ACTION', employee1);
			assert.equal(isAllowedAfter, true);
		});

		it('should not allow action by any member of group in case of failed voting', async() => {
			await daoBaseAuto.allowActionByAnyMemberOfGroupAuto('ANY_ACTION', 'Employees', {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBefore = await store.isAllowedActionByMembership('ANY_ACTION', employee1);
			assert.equal(isAllowedBefore, false);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const isAllowedAfter = await store.isAllowedActionByMembership('ANY_ACTION', employee1);
			assert.equal(isAllowedAfter, false);
		});
	});

	describe('allowActionByShareholderAuto()', () => {
		it('should allow action by shareholder in case of successful voting', async() => {
			await daoBaseAuto.allowActionByShareholderAuto('ANY_ACTION', token.address, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBeforeByToken = await store.isAllowedActionByShareholder('ANY_ACTION', token.address);
			const isAllowedBeforeByUser = await daoBase.isCanDoAction(outsider1, 'ANY_ACTION');
			assert.equal(isAllowedBeforeByToken, false);
			assert.equal(isAllowedBeforeByUser, false);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const isAllowedAfterByToken = await store.isAllowedActionByShareholder('ANY_ACTION', token.address);
			const isAllowedAfterByUser = await daoBase.isCanDoAction(outsider1, 'ANY_ACTION');
			assert.equal(isAllowedAfterByToken, true);
			assert.equal(isAllowedAfterByUser, true);
		});

		it('should not allow action by shareholder in case of failed voting', async() => {
			await daoBaseAuto.allowActionByShareholderAuto('ANY_ACTION', token.address, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBeforeByToken = await store.isAllowedActionByShareholder('ANY_ACTION', token.address);
			const isAllowedBeforeByUser = await daoBase.isCanDoAction(outsider1, 'ANY_ACTION');
			assert.equal(isAllowedBeforeByToken, false);
			assert.equal(isAllowedBeforeByUser, false);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const isAllowedAfterByToken = await store.isAllowedActionByShareholder('ANY_ACTION', token.address);
			const isAllowedAfterByUser = await daoBase.isCanDoAction(outsider1, 'ANY_ACTION');
			assert.equal(isAllowedAfterByToken, false);
			assert.equal(isAllowedAfterByUser, false);
		});
	});

	describe('allowActionByVotingAuto()', () => {
		it('should allow action by voting in case of successful voting', async() => {
			await daoBaseAuto.allowActionByVotingAuto('ANY_ACTION', token.address, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBeforeByToken = await store.isAllowedActionByVoting('ANY_ACTION', token.address);
			assert.equal(isAllowedBeforeByToken, false);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const isAllowedAfterByToken = await store.isAllowedActionByVoting('ANY_ACTION', token.address);
			assert.equal(isAllowedAfterByToken, true);
		});

		it('should not allow action by voting in case of failed voting', async() => {
			await daoBaseAuto.allowActionByVotingAuto('ANY_ACTION', token.address, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const isAllowedBeforeByToken = await store.isAllowedActionByVoting('ANY_ACTION', token.address);
			assert.equal(isAllowedBeforeByToken, false);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const isAllowedAfterByToken = await store.isAllowedActionByVoting('ANY_ACTION', token.address);
			assert.equal(isAllowedAfterByToken, false);
		});
	});

	describe('issueTokensAuto()', () => {
		it('should issue tokens in case of successful voting', async() => {
			await daoBaseAuto.issueTokensAuto(token.address, employee1, 1, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const balanceBefore = await token.balanceOf(employee1);
			assert.equal(balanceBefore, 0);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const balanceAfter = await token.balanceOf(employee1);
			assert.equal(balanceAfter, 1);
		});

		it('should not issue tokens in case of failed voting', async() => {
			await daoBaseAuto.issueTokensAuto(token.address, employee1, 1, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const balanceBefore = await token.balanceOf(employee1);
			assert.equal(balanceBefore, 0);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const balanceAfter = await token.balanceOf(employee1);
			assert.equal(balanceAfter, 0);
		});
	});

	describe('removeGroupMemberAuto()', () => {
		it('should remove group member in case of successful voting', async() => {
			await daoBaseAuto.removeGroupMemberAuto('Employees', employee2, {from: creator}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const membersBefore = await daoBase.getGroupMembers("Employees");
			assert.equal(membersBefore.length, 3);

			await voting.vote(true, {from: employee1}).should.be.fulfilled;

			const membersAfter = await daoBase.getGroupMembers("Employees");
			assert.equal(membersAfter.length, 2);
		});

		it('should not remove group member in case of failed voting', async() => {
			await daoBaseAuto.removeGroupMemberAuto('Employees', employee2, {from: creator}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const membersBefore = await daoBase.getGroupMembers("Employees");
			assert.equal(membersBefore.length, 3);

			await voting.vote(false, {from: employee1}).should.be.fulfilled;

			const membersAfter = await daoBase.getGroupMembers("Employees");
			assert.equal(membersAfter.length, 3);
		});
	});

	describe('upgradeDaoContractAuto()', () => {
		it('should ugrade dao contract in case of successful voting', async() => {
			const newDaoBase = await DaoBaseWithUnpackers.new(store.address, {from: creator});
			await daoBaseAuto.upgradeDaoContractAuto(newDaoBase.address, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const storeOwnerBefore = await store.owner();
			assert.equal(storeOwnerBefore, daoBase.address);

			await voting.vote(true, {from: employee2}).should.be.fulfilled;

			const storeOwnerAfter = await store.owner();
			assert.equal(storeOwnerAfter, newDaoBase.address);
		});

		it('should not ugrade dao contract in case of failed voting', async() => {
			const newDaoBase = await DaoBaseWithUnpackers.new(store.address, {from: creator});
			await daoBaseAuto.upgradeDaoContractAuto(newDaoBase.address, {from: employee1}).should.be.fulfilled;
			const voting = await getVoting(daoBase, 0);

			const storeOwnerBefore = await store.owner();
			assert.equal(storeOwnerBefore, daoBase.address);

			await voting.vote(false, {from: employee2}).should.be.fulfilled;

			const storeOwnerAfter = await store.owner();
			assert.equal(storeOwnerAfter, daoBase.address);
		});
	});
});