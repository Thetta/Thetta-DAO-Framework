var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');
var DaoBaseWithUnpackersMock = artifacts.require('./DaoBaseWithUnpackersMock');
var DaoBaseAutoMock = artifacts.require('./DaoBaseAutoMock');

var DaoBaseAuto = artifacts.require('./DaoBaseAuto');
var GenericCaller = artifacts.require('./GenericCaller');

var GenericProposal = artifacts.require("./GenericProposal");
var DaoClient = artifacts.require("./DaoClient");

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
	let daoBaseMock;
	let daoBaseAutoMock;
	let issueTokens;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];
	const employee3 = accounts[4];

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 1000);
		store = await DaoStorage.new([token.address],{from: creator});

		daoBaseMock = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
		issueTokens = await daoBaseMock.ISSUE_TOKENS();

		daoBaseAutoMock = await DaoBaseAutoMock.new(daoBaseMock.address,{from: creator, gas: 1000000});

		// 10 millions
		//daoBaseAuto = await DaoBaseAuto.new(daoBaseMock.address,{from: creator, gas: 15 * 1000000});

		//
		//genericCaller = await GenericCaller.new(daoBaseMock.address,{from: creator, gas: 10 * 1000000});
	});

	describe('upgradeDaoContractGeneric()', function () {
		it('Should return correct values',async() => {
			let daoBaseNew = await DaoBaseWithUnpackersMock.new(store.address,{from: creator});
			await daoBaseAutoMock.upgradeDaoContractAuto(daoBaseNew.address);
			assert.equal(await daoBaseMock.b(), daoBaseNew.address);
		});
	});

	describe('addGroupMemberGeneric()', function () {
		it('Should return correct values',async() => {
			// TODO: remove, just to run tests...
			//assert.equal(issueTokens, await daoBaseMock.ISSUE_TOKENS());

			await daoBaseAuto.addGroupMemberAuto("Employees", creator);
			assert.equal(await daoBaseMock.groupNameHash(), KECCAK256("Employees"));
			assert.equal(await daoBaseMock.member(), creator);
		});
	});

	describe('issueTokensGeneric()', function () {
		it('Should return correct values',async() => {
			await daoBaseAutoMock.issueTokensAuto(token.address, creator, 100);
			assert.equal(await daoBaseMock.a(), creator);
			assert.equal(await daoBaseMock.tokenAddress(), token.address);
			assert.equal(await daoBaseMock.amount(), 100);
		});
	});

	describe('removeGroupMemberGeneric()', function () {
		it('Should return correct values',async() => {
			await daoBaseAutoMock.removeGroupMemberAuto("Test", employee1);
			assert.equal(await daoBaseMock.groupNameHash(), KECCAK256("Test"));
			assert.equal(await daoBaseMock.a(), employee1);
		});
	});

	describe('allowActionByShareholderAuto()', function () {
		it('Should return correct values',async() => {
			await daoBaseAutoMock.allowActionByShareholderAuto(issueTokens, token.address);
			assert.equal(await daoBaseMock.permission(), issueTokens);
			assert.equal(await daoBaseMock.a(), token.address);
		});
	});

	describe('allowActionByVotingAuto()', function () {
		it('Should return correct values',async() => {
			await daoBaseAutoMock.allowActionByVotingAuto(issueTokens, token.address);
			assert.equal(await daoBaseMock.permission(), issueTokens);
			assert.equal(await daoBaseMock.a(), token.address);
		});
	});

	describe('allowActionByAddressAuto()', function () {
		it('Should return correct values',async() => {
			await daoBaseAutoMock.allowActionByAddressAuto(issueTokens, employee1);
			assert.equal(await daoBaseMock.permission(), issueTokens);
			assert.equal(await daoBaseMock.a(), employee1);
		});
	});

	describe('allowActionByAnyMemberOfGroupAuto()', function () {
		it('Should return correct values',async() => {
			await daoBaseAutoMock.allowActionByAnyMemberOfGroupAuto(issueTokens, "Employees");
			assert.equal(await daoBaseMock.permission(), issueTokens);
			assert.equal(await daoBaseMock.groupNameHash(), KECCAK256("Employees"));
		});
	});
});
