const { fromUtf8, padToBytes32, uintToBytes32 } = require('./utils/helpers');

const StdDaoToken = artifacts.require('./StdDaoToken');
const DaoStorage = artifacts.require('./DaoStorage');
const DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');
const DaoBaseWithUnpackersMock = artifacts.require('./DaoBaseWithUnpackersMock');

contract('DaoBaseWithUnpackers', (accounts) => {
	let token;
	let store;
	let daoBase;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];
	const employee3 = accounts[4];

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT", 18, true, true, 100 * 10^18);
		// store = await DaoStorage.new([token.address],{from: creator});

		store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address,{from: creator});
		daoBaseMock = await DaoBaseWithUnpackersMock.new([token.address],{from: creator});

		await store.allowActionByAddress(await daoBase.MANAGE_GROUPS(), creator);
		await store.allowActionByAddress(await daoBase.UPGRADE_DAO_CONTRACT(), creator);
		await store.allowActionByAddress(await daoBase.ISSUE_TOKENS(), creator);

		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);
	});

	describe('upgradeDaoContractGeneric()', () => {
		it('should upgrade dao contract', async() => {
			store = await DaoStorage.new([token.address],{from: creator});
		let daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{from: creator});
			await daoBase.upgradeDaoContractGeneric([padToBytes32(daoBaseNew.address, 'left')]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			store = await DaoStorage.new([token.address],{from: creator});
		let daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{from: creator});
			await daoBaseMock.upgradeDaoContractGeneric([padToBytes32(daoBaseNew.address, 'left')]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramAddress1(), daoBaseNew.address);
		});
	});

	describe('addGroupMemberGeneric()', () => {
		it('should add a new group member', async() => {
			await daoBase.addGroupMemberGeneric([fromUtf8("ANY_GROUP"), padToBytes32(employee1, 'left')]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.addGroupMemberGeneric([fromUtf8("ANY_GROUP"), padToBytes32(employee1, 'left')]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramString1(), "ANY_GROUP");
			assert.equal(await daoBaseMock.paramAddress1(), employee1);
		});
	});

	describe('issueTokensGeneric()', () => {
		it('should issue tokens', async () => {
			await daoBase.issueTokensGeneric([
				padToBytes32(token.address, 'left'), 
				padToBytes32(employee1, 'left'), 
				uintToBytes32(1)
			]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.issueTokensGeneric([
				padToBytes32(token.address, 'left'), 
				padToBytes32(employee1, 'left'), 
				uintToBytes32(1)
			]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramAddress1(), token.address);
			assert.equal(await daoBaseMock.paramAddress2(), employee1);
			assert.equal(await daoBaseMock.paramUint1(), 1);
		});
	});

	describe('removeGroupMemberGeneric()', () => {
		it('should remove group member', async() => {
			await daoBase.addGroupMemberGeneric([fromUtf8("GROUP1"), padToBytes32(employee1, 'left')]).should.be.fulfilled;
			await daoBase.removeGroupMemberGeneric([fromUtf8("GROUP1"), padToBytes32(employee1, 'left')]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.removeGroupMemberGeneric([fromUtf8("GROUP1"), padToBytes32(employee1, 'left')]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramString1(), "GROUP1");
			assert.equal(await daoBaseMock.paramAddress1(), employee1);
		});
	});

	describe('allowActionByShareholderGeneric()', () => {
		it('should allow action by shareholder', async() => {
			await daoBase.allowActionByShareholderGeneric([fromUtf8("ANY_ACTION"), padToBytes32(creator, 'left')]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.allowActionByShareholderGeneric([fromUtf8("ANY_ACTION"), padToBytes32(creator, 'left')]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramBytes1(), fromUtf8("ANY_ACTION"));
			assert.equal(await daoBaseMock.paramAddress1(), creator);
		});
	});

	describe('allowActionByVotingGeneric()', () => {
		it('should allow action by voting', async () => {
			await daoBase.allowActionByVotingGeneric([fromUtf8("ANY_ACTION"), padToBytes32(token.address, 'left')]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.allowActionByVotingGeneric([fromUtf8("ANY_ACTION"), padToBytes32(token.address, 'left')]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramBytes1(), fromUtf8("ANY_ACTION"));
			assert.equal(await daoBaseMock.paramAddress1(), token.address);
		});
	});

	describe('allowActionByAddressGeneric()', () => {
		it('should allow action by address', async () => {
			await daoBase.allowActionByAddressGeneric([fromUtf8("ANY_ACTION"), padToBytes32(creator, 'left')]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.allowActionByAddressGeneric([fromUtf8("ANY_ACTION"), padToBytes32(creator, 'left')]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramBytes1(), fromUtf8("ANY_ACTION"));
			assert.equal(await daoBaseMock.paramAddress1(), creator);
		});
	});

	describe('allowActionByAnyMemberOfGroupGeneric', () => {
		it('should allow action by any member of group', async() => {
			await daoBase.allowActionByAnyMemberOfGroupGeneric([fromUtf8("ANY_ACTION"), fromUtf8("ANY_GROUP")]).should.be.fulfilled;
		});

		it('should unpack params', async() => {
			await daoBaseMock.allowActionByAnyMemberOfGroupGeneric([fromUtf8("ANY_ACTION"), fromUtf8("ANY_GROUP")]).should.be.fulfilled;

			assert.equal(await daoBaseMock.paramBytes1(), fromUtf8("ANY_ACTION"));
			assert.equal(await daoBaseMock.paramString1(), "ANY_GROUP");
		});
	});
});