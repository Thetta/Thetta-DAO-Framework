/*var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");
var InformalProposal = artifacts.require("./InformalProposal");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var LiquidVoting = artifacts.require("./LiquidVoting");
var IProposal = artifacts.require("./IProposal");

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function KECCAK256 (x){
	return web3.sha3(x);
}

var utf8 = require('utf8');

function padToBytes32(n) {
	while (n.length < 64) {
		n = n + "0";
	}
	return "0x" + n;
}

function addressToBytes32(addr){
	while (addr.length < 66) {
		addr = '0' + addr;
	}
	return '0x' + addr.replace('0x', '');
}

function UintToToBytes32(n) {
	n = Number(n).toString(16);
	while (n.length < 64) {
		n = "0" + n;
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

contract('LiquidVoting(quorumPercent, consensusPercent)', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];

	let r2;
	let token;
	let daoBase;
	let moneyflowInstance;
	let aacInstance;

	let issueTokens;
	let manageGroups;
	let addNewProposal;
	let addNewTask;
	let withdrawDonations;
	let setRootWeiReceiver;

	const VOTING_TYPE_LIQUID = 4;

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
		await token.mintFor(creator, 1);
		await token.mintFor(employee1, 1);

		let store = await DaoStorage.new([token.address],{ from: creator });
		daoBase = await DaoBaseWithUnpackers.new(store.address,{ from: creator });
		moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});
		aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, {from: creator});

		issueTokens = await daoBase.ISSUE_TOKENS();

		manageGroups = await daoBase.MANAGE_GROUPS();

		addNewProposal = await daoBase.ADD_NEW_PROPOSAL();

		withdrawDonations = await moneyflowInstance.WITHDRAW_DONATIONS();

		setRootWeiReceiver = await moneyflowInstance.SET_ROOT_WEI_RECEIVER();

		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(manageGroups,creator);
		await store.allowActionByAddress(issueTokens,creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		// AAC requires special permissions
		await daoBase.allowActionByAddress(addNewProposal, aacInstance.address);
		await daoBase.allowActionByAddress(withdrawDonations, aacInstance.address);
		await daoBase.allowActionByAddress(setRootWeiReceiver, aacInstance.address);

		// do not forget to transfer ownership
		await daoBase.allowActionByAnyMemberOfGroup(addNewProposal,"Employees");

		await daoBase.allowActionByVoting(manageGroups, token.address);
		await daoBase.allowActionByVoting(issueTokens, token.address);
		await daoBase.allowActionByVoting(addNewProposal, token.address);

		// check permissions (permissions must be blocked)
		await daoBase.addGroupMember("Employees", employee1);
		// await daoBase.addGroupMember("Employees", creator);

	});
	describe('getPowerOf()', function () {
		it('Check getPower()',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await LiquidVoting.at(votingAddress);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');
		});

		it('Check getPower() when voice delegated',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await LiquidVoting.at(votingAddress);

			voting.delegateMyVoiceTo(employee1, 1);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedToMePower({from: employee1});
			assert.equal(r2.toNumber(),1,'yes');
		});

		it('Check getPower() when voice delegated and delegation removed',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await LiquidVoting.at(votingAddress);

			voting.delegateMyVoiceTo(employee1, 1);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getDelegatedToMePower({from: employee1});
			assert.equal(r2.toNumber(),1,'yes');

			voting.removeDelegation(employee1);

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),1,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),1,'yes');
			r2 = await voting.getDelegatedToMePower({from: employee1});
			assert.equal(r2.toNumber(),0,'yes');
		});
	});

	describe('getDelegatedToMePower()', function () {
		it('Check getDelegatedToMePower()',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await LiquidVoting.at(votingAddress);

			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),0,'yes');

			voting.delegateMyVoiceTo(creator, 1, {from: employee1});

			r2 = await voting.getPowerOf(creator);
			assert.equal(r2.toNumber(),2,'yes');
			r2 = await voting.getPowerOf(employee1);
			assert.equal(r2.toNumber(),0,'yes');
			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),1,'yes');
		});
	});

	describe('delegateMyVoiceTo()', function () {
		it('Check delegateMyVoiceTo()',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await LiquidVoting.at(votingAddress);

			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),0);

			voting.delegateMyVoiceTo(creator, 1, {from: employee1});

			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),1);
		});
	});

	describe('removeDelegation()', function () {
		it('Check removeDelegation()',async() => {
			await aacInstance.setVotingParams(setRootWeiReceiver, VOTING_TYPE_LIQUID, UintToToBytes32(0), fromUtf8(""), UintToToBytes32(100), UintToToBytes32(100), addressToBytes32(token.address));
			const wae = await WeiAbsoluteExpense.new(1000);
			await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

			const pa = await daoBase.getProposalAtIndex(0);
			const proposal = await IProposal.at(pa);
			const votingAddress = await proposal.getVoting();
			const voting = await LiquidVoting.at(votingAddress);

			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),0,);

			voting.delegateMyVoiceTo(creator, 1, {from: employee1});

			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),1,);

			voting.removeDelegation(creator, {from: employee1});

			r2 = await voting.getDelegatedToMePower();
			assert.equal(r2.toNumber(),0,);
		});
	});
});*/
