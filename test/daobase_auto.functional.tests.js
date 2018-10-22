var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var DaoBaseAuto = artifacts.require("./DaoBaseAuto");
var MoneyFlow = artifacts.require('./MoneyFlow');
var MoneyflowAuto = artifacts.require('./MoneyflowAuto');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var Voting = artifacts.require('./Voting');

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

function addressToBytes32 (addr) {
	while (addr.length < 66) {
		addr = '0' + addr;
	}
	return '0x' + addr.replace('0x', '');
}

const VOTING_TYPE_SIMPLE_TOKEN = 2;

contract('DaoBaseAuto', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[5];

	let manageGroups;
	let addNewProposal;

	let token;
	let daoBase;
	let store;
	let aacInstance;

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 1000);
		await token.mintFor(employee1, 600);
		await token.mintFor(employee2, 600);
		
		store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		aacInstance = await DaoBaseAuto.new(daoBase.address, {from: creator});

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		manageGroups = await daoBase.MANAGE_GROUPS();
		addNewProposal = await daoBase.ADD_NEW_PROPOSAL();

		const VOTING_TYPE_1P1V = 1;
		await aacInstance.setVotingParams(manageGroups, VOTING_TYPE_1P1V, UintToToBytes32(0), fromUtf8("Employees"), UintToToBytes32(51), UintToToBytes32(51), 0);

		await daoBase.allowActionByAddress(addNewProposal, aacInstance.address);

		// add creator as first employee
		await daoBase.addGroupMember("Employees", creator);
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);

		await daoBase.renounceOwnership();
	});

	it('test', async() => {
		let members = await daoBase.getGroupMembers("Employees");
		console.log(members);

		await aacInstance.addGroupMemberAuto("Employees", outsider, {from: creator}).should.be.fulfilled;

		const proposalAddress = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(proposalAddress);
		const votingAddress = await proposal.getVoting();
		const voting = await IVoting.at(votingAddress);

		console.log(await voting.getVotingStats());
		console.log(await voting.isFinished());
		console.log(await voting.isYes());		

		await voting.vote(true, {from: employee1});

		console.log(await voting.getVotingStats());
		console.log(await voting.isFinished());
		console.log(await voting.isYes());		

		members = await daoBase.getGroupMembers("Employees");
		console.log(members);
	});
});
