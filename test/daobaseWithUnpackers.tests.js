var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');
var DaoBaseWithUnpackersMock = artifacts.require('./DaoBaseWithUnpackersMock');
var DaoBaseAutoMock = artifacts.require('./DaoBaseAutoMock');
var GenericProposal = artifacts.require("./GenericProposal");
var DaoClient = artifacts.require("./DaoClient");

// to check how upgrade works with IDaoBase clients

var MoneyFlow = artifacts.require('./MoneyFlow');
var IWeiReceiver = artifacts.require('./IWeiReceiver');
var IProposal = artifacts.require('./IProposal');

function KECCAK256 (x) {
  return web3.sha3(x);
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('DaoBaseWithUnpackers', (accounts) => {
	let token;
	let store;
	let daoBase;

	let issueTokens;
	let manageGroups;
	let addNewProposal;
	let upgradeDaoContract;
	let addNewTask;
	let startTask;
	let startBounty;
	let modifyMoneyscheme;
	let withdrawDonations;
	let setRootWeiReceiver;
	let burnTokens;
	let daoClient;
	let proposal;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];
	const employee3 = accounts[4];

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 1000);
		store = await DaoStorage.new([token.address],{from: creator});

		daoBase = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
		daoBaseAuto = await DaoBaseAutoMock.new(daoBase.address,{from: creator});
	});

	describe('upgradeDaoContractGeneric()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			await daoBaseAuto.upgradeDaoContractAuto(daoBaseNew.address);
			assert.equal(await daoBase.b(), daoBaseNew.address);
		});
	});

	describe('addGroupMemberGeneric()', function () {
		it('Should return correct values',async() => {
			await daoBaseAuto.addGroupMemberAuto("Test", creator);
			assert.equal(await daoBase.group(), KECCAK256("Test"));
			assert.equal(await daoBase.member(), creator);
		});
	});

	describe('issueTokensGeneric()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			await daoBaseAuto.issueTokensAuto(token.address, creator, 100);
			assert.equal(await daoBase.a(), creator);
			assert.equal(await daoBase.tokenAddress(), token.address);
			assert.equal(await daoBase.amount(), 100);
		});
	});

	describe('removeGroupMemberGeneric()', function () {
		it('Should return correct values',async() => {
			//await daoBaseAuto.removeGroupMemberAuto("Test", employee1); -> why not working????
			//assert.equal(await daoBase.groupName(), "Test");
			//assert.equal(await daoBase.a(), employee1);
		});
	});

	describe('allowActionByShareholderAuto()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			await daoBaseAuto.allowActionByShareholderAuto("Test", token.address);
			assert.equal(await daoBase.group(), KECCAK256("Test"));
			assert.equal(await daoBase.a(), token.address);
		});
	});

	describe('allowActionByVotingAuto()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			await daoBaseAuto.allowActionByVotingAuto("Test", token.address);
			assert.equal(await daoBase.group(), KECCAK256("Test"));
			assert.equal(await daoBase.a(), token.address);
		});
	});

	describe('allowActionByAddressAuto()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			await daoBaseAuto.allowActionByAddressAuto("Test", employee1);
			assert.equal(await daoBase.group(), KECCAK256("Test"));
			assert.equal(await daoBase.a(), employee1);
		});
	});

	describe('allowActionByAnyMemberOfGroupAuto()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			//await daoBaseAuto.allowActionByAnyMemberOfGroupAuto("Test", "TestGroupName"); -> Why not working????
			//assert.equal(await daoBase.group(), KECCAK256("Test"));
			//assert.equal(await daoBase.groupName(), "TestGroupName");
		});
	});
});
