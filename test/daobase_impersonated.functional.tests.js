var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var DaoBaseImpersonated = artifacts.require("./DaoBaseImpersonated");

var IVoting = artifacts.require("./IVoting");
var IProposal = artifacts.require("./IProposal");

function KECCAK256 (x){
	return web3.sha3(x);
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

var utf8 = require('utf8');

function UintToToBytes32(n) {
	n = Number(n).toString(16);
	while (n.length < 64) {
		n = "0" + n;
	}
	return "0x" + n;
}

function padToBytes32(n) {
	while (n.length < 64) {
		n = n + "0";
	}
	return "0x" + n;
}

function fromUtf8(str) {
	str = utf8.encode(str);
	var hex = "";
	for (var i = 0; i < str.length; i++) {
		var code = str.charCodeAt(i);
		if (code === 0) {
			break;
		}
		var n = code.toString(16);
		hex += n.length < 2 ? '0' + n : n;
	}

	return padToBytes32(hex);
};

contract('DaoBaseImpersonated', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const outsider = accounts[4];
	const output = accounts[5];

	let issueTokens;
	let manageGroups;
	let addNewProposal;
	let upgradeDaoContract;
	let removeGroupMember;
	let allowActionByAddress;
	let allowActionByVoting;
	let allowActionByShareholder;
	let allowActionByAnyMemberOfGroup;
	let message = "Test message";
	let groupName = "Employees";

	let money = web3.toWei(0.001, "ether");

	let token;
	let daoBase;
	let daoBaseNew;
	let store;
	let aacInstance;

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);

		store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		impersonatedInstance = await DaoBaseImpersonated.new(daoBase.address, {from: creator});
		issueTokens = await daoBase.ISSUE_TOKENS();
		manageGroups = await daoBase.MANAGE_GROUPS();
		upgradeDaoContract = await daoBase.UPGRADE_DAO_CONTRACT();
		removeGroupMember = await daoBase.REMOVE_GROUP_MEMBER();
		allowActionByShareholder = await daoBase.ALLOW_ACTION_BY_SHAREHOLDER();
		allowActionByVoting = await daoBase.ALLOW_ACTION_BY_VOTING();
		allowActionByAddress = await daoBase.ALLOW_ACTION_BY_ADDRESS();
		allowActionByAnyMemberOfGroup = await daoBase.ALLOW_ACTION_BY_ANY_MEMBER_OF_GROUP();

		// add creator as first employee
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(manageGroups,creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);
	});

	it('should not issue tokens because account who signed message has no rights',async() => {
		await daoBase.allowActionByAddress(issueTokens, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.issueTokensImp(KECCAK256(message), sig, token.address, employee1, 100).should.be.rejectedWith('revert');
	});

	it('should not issue tokens because impersonatedInstance has no rights',async() => {
		await daoBase.allowActionByAddress(issueTokens, creator);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.issueTokensImp(KECCAK256(message), sig, token.address, employee1, 100).should.be.rejectedWith('revert');
	});

	it('should issue tokens because account who sign message and impersonatedInstance has rights',async() => {
		await daoBase.allowActionByAddress(issueTokens, creator);
		await daoBase.allowActionByAddress(issueTokens, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.issueTokensImp(KECCAK256(message), sig, token.address, employee1, 100);

		assert.equal(await token.balanceOf(employee1), 100);
	});

	it('should not add group member because account who signed message has no rights',async() => {
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(employee2, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1).should.be.rejectedWith('revert');
	});

	it('should not add group member because impersonatedInstance has no rights',async() => {
		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1).should.be.rejectedWith('revert');
	});

	it('should add group member because account who sign message and impersonatedInstance has rights',async() => {
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);

		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);
	});

	it('should not remove group member because account who signed message has no rights',async() => {
		await daoBase.allowActionByAddress(removeGroupMember, impersonatedInstance.address);
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);

		await impersonatedInstance.removeGroupMemberImp(KECCAK256(message), sig, groupName, employee1).should.be.rejectedWith('revert');
	});

	it('should not remove group member because impersonatedInstance has no rights',async() => {
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);

		await impersonatedInstance.removeGroupMemberImp(KECCAK256(message), sig, groupName, employee1).should.be.rejectedWith('revert');
	});

	it('should remove group member because account who sign message and impersonatedInstance has rights',async() => {
		await daoBase.allowActionByAddress(removeGroupMember, creator);
		await daoBase.allowActionByAddress(removeGroupMember, impersonatedInstance.address);
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);

		await impersonatedInstance.removeGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), false);
	});

	it('should not allow action by shareholder because account who signed message has no rights',async() => {
		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByShareholderImp(KECCAK256(message), sig, "Test", token.address).should.be.rejectedWith('revert');
	});

	it('should not allow action by shareholder because impersonatedInstance has no rights',async() => {
		await daoBase.allowActionByAddress(allowActionByShareholder, creator);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByShareholderImp(KECCAK256(message), sig, "Test", token.address).should.be.rejectedWith('revert');
	});

	it('should allow action by shareholder because account who signed message and impersonatedInstance have rights',async() => {
		await daoBase.allowActionByAddress(allowActionByShareholder, creator);
		await daoBase.allowActionByAddress(allowActionByShareholder, impersonatedInstance.address);
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByShareholderImp(KECCAK256(message), sig, "Test", token.address);
	});

	it('should not allow action by voting because account who signed message has no rights',async() => {
		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByVotingImp(KECCAK256(message), sig, "Test", token.address).should.be.rejectedWith('revert');
	});

	it('should not allow action by voting because impersonatedInstance has no rights',async() => {
		await daoBase.allowActionByAddress(allowActionByVoting, creator);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByVotingImp(KECCAK256(message), sig, "Test", token.address).should.be.rejectedWith('revert');
	});

	it('should allow action by voting because account who signed message has rights',async() => {
		await daoBase.allowActionByAddress(allowActionByVoting, creator);
		await daoBase.allowActionByAddress(allowActionByVoting, impersonatedInstance.address);
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByVotingImp(KECCAK256(message), sig, "Test", token.address);
	});

	it('should not allow action by address because account who signed message has no rights',async() => {
		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByAddressImp(KECCAK256(message), sig, "Test", employee1).should.be.rejectedWith('revert');
	});

	it('should not allow action by address because impersonatedInstance has no rights',async() => {
		await daoBase.allowActionByAddress(allowActionByAddress, creator);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByAddressImp(KECCAK256(message), sig, "Test", employee1).should.be.rejectedWith('revert');
	});

	it('should allow action by address because account who signed message has rights',async() => {
		await daoBase.allowActionByAddress(allowActionByAddress, creator);
		await daoBase.allowActionByAddress(allowActionByAddress, impersonatedInstance.address);
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.allowActionByAddressImp(KECCAK256(message), sig, "Test", employee1);
	});

	it('should not allow action by any member of group because account who signed message has no rights',async() => {
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);

		await impersonatedInstance.allowActionByAnyMemberOfGroupImp(KECCAK256(message), sig, "Test", groupName).should.be.rejectedWith('revert');
	});

	it('should not allow action by any member of group because impersonatedInstance has no rights',async() => {
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);

		await impersonatedInstance.allowActionByAnyMemberOfGroupImp(KECCAK256(message), sig, "Test", groupName).should.be.rejectedWith('revert');
	});

	it('should allow action by any member of group because account who signed message has rights',async() => {
		await daoBase.allowActionByAddress(allowActionByAnyMemberOfGroup, creator);
		await daoBase.allowActionByAddress(allowActionByAnyMemberOfGroup, impersonatedInstance.address);
		await daoBase.allowActionByAddress(manageGroups, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.addGroupMemberImp(KECCAK256(message), sig, groupName, employee1);
		assert.equal(await daoBase.isGroupMember(groupName, employee1), true);

		await impersonatedInstance.allowActionByAnyMemberOfGroupImp(KECCAK256(message), sig, "Test", groupName);
	});

	it('should not upgrade dao contract because account who signed message has no rights',async() => {
		daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		await daoBase.allowActionByAddress(upgradeDaoContract, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.upgradeDaoContractImp(KECCAK256(message), sig, daoBaseNew.address).should.be.rejectedWith('revert');
	});

	it('should not upgrade dao contract because impersonatedInstance has no rights',async() => {
		daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		await daoBase.allowActionByAddress(upgradeDaoContract, creator);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.upgradeDaoContractImp(KECCAK256(message), sig, daoBaseNew.address).should.be.rejectedWith('revert');
	});

	it('should upgrade dao contract because account who signed message has rights',async() => {
		daoBaseNew = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		await daoBase.allowActionByAddress(upgradeDaoContract, creator);
		await daoBase.allowActionByAddress(upgradeDaoContract, impersonatedInstance.address);
		await daoBase.renounceOwnership();

		let sig = await web3.eth.sign(creator, KECCAK256(message));

		await impersonatedInstance.upgradeDaoContractImp(KECCAK256(message), sig, daoBaseNew.address);
	});
});
