const StdDaoToken = artifacts.require('./StdDaoToken');
const DaoStorage = artifacts.require('./DaoStorage');
const DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

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
		store = await DaoStorage.new([token.address],{from: creator});

		daoBase = await DaoBaseWithUnpackers.new(store.address,{from: creator});

		await store.allowActionByAddress(await daoBase.MANAGE_GROUPS(), creator);
		await store.allowActionByAddress(await daoBase.UPGRADE_DAO_CONTRACT(), creator);
		await store.allowActionByAddress(await daoBase.ISSUE_TOKENS(), creator);

		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);
	});

	describe('upgradeDaoContractGeneric()', () => {
		it('should upgrade dao contract', async() => {
			let daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{from: creator});
			await daoBase.upgradeDaoContractGeneric([daoBaseNew.address]).should.be.fulfilled;
		});
	});

	describe('addGroupMemberGeneric()', () => {
		it('should add a new group member', async() => {
			await daoBase.addGroupMemberGeneric(["ANY_GROUP", 0x01]).should.be.fulfilled;
		});
	});

	// TODO: convert address to bytes32
	// describe('issueTokensGeneric()', () => {
	// 	it('should issue tokens', async () => {
	// 		await daoBase.issueTokensGeneric([token.address, employee1, 1]).should.be.fulfilled;
	// 	});
	// });

	describe('removeGroupMemberGeneric()', () => {
		it('should remove group member', async() => {
			await daoBase.addGroupMemberGeneric(["GROUP1", employee1]).should.be.fulfilled;
			await daoBase.removeGroupMemberGeneric(["GROUP1", employee1]).should.be.fulfilled;
		});
	});

	describe('allowActionByShareholderGeneric()', () => {
		it('should allow action by shareholder', async() => {
			await daoBase.allowActionByShareholderGeneric(["ANY_ACTION", creator]).should.be.fulfilled;
		});
	});

	describe('allowActionByVotingGeneric()', () => {
		it('should allow action by voting', async () => {
			await daoBase.allowActionByVotingGeneric(["ANY_ACTION", token.address]);
		});
	});

	describe('allowActionByAddressGeneric()', () => {
		it('should allow action by address', async () => {
			await daoBase.allowActionByAddressGeneric(["ANY_ACTION", creator]);
		});
	});

	describe('allowActionByAnyMemberOfGroupGeneric', () => {
		it('should allow action by any member of group', async() => {
			await daoBase.allowActionByAnyMemberOfGroupGeneric(["ANY_ACTION", "ANY_GROUP"]);
		});
	});
});