var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var WeiAbsoluteExpense = artifacts.require("./WeiAbsoluteExpense");

var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

var Voting = artifacts.require("./Voting");
var Voting_1p1v = artifacts.require("./Voting_1p1v");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

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

global.contract('Voting_1p1v(quorumPercent, consensusPercent)', (accounts) => {
	const creator   = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const employee4 = accounts[4];
	const employee5 = accounts[5];
	const outsider  = accounts[6];
	const output    = accounts[7]; 

	let r2;
	let token;
	let daoBase;
	let moneyflowInstance;
	let aacInstance;

	let money = web3.toWei(0.001, "ether");
	let VOTING_TYPE_1P1V = 1;

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);

		let store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});
		daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		moneyflowInstance = await MoneyFlow.new(daoBase.address, {from: creator});

		aacInstance = await MoneyflowAuto.new(daoBase.address, moneyflowInstance.address, {from: creator, gas: 10000000});

		///////////////////////////////////////////////////
		// SEE THIS? set voting type for the action!
		const VOTING_TYPE_1P1V = 1;
		const VOTING_TYPE_SIMPLE_TOKEN = 2;

		// add creator as first employee	
		// await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		await daoBase.allowActionByAnyMemberOfGroup("addNewEmployee","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");
		await daoBase.allowActionByAddress("issueTokens", creator);
		
		// AAC requires special permissions
		await daoBase.allowActionByAddress("addNewProposal", aacInstance.address);
		// these actions required if AAC will call this actions DIRECTLY (without voting)
		await daoBase.allowActionByAddress("withdrawDonations", aacInstance.address);
		await daoBase.allowActionByAddress("addNewTask", aacInstance.address);
		await daoBase.allowActionByAddress("setRootWeiReceiver", aacInstance.address);
		await daoBase.allowActionByAddress("modifyMoneyscheme", aacInstance.address);	

		// check permissions (permissions must be blocked)
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);
		await daoBase.addGroupMember("Employees", employee4);
		await daoBase.addGroupMember("Employees", employee5);
	});

	global.it('0. should create new voting', async()=>{
		let isGroupMember = await daoBase.isGroupMember('Employees', employee1);
		global.assert.equal(isGroupMember,true, 'Creator is ein the group');
		let voting = await Voting_1p1v.new(daoBase.address, employee1, employee1, 60, "Employees", 51, 71, 0);
		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		let groupName = await voting.groupName();
		global.assert.equal(quorumPercent.toNumber(), 51, 'quorumPercent should be 51'); 
		global.assert.equal(consensusPercent.toNumber(), 71, 'consensusPercent should be 51'); 
		global.assert.equal(groupName, "Employees", 'groupName should be Employees'); 
	})

	global.it('1. Scenario: 5 employees, 5/5 voted yes, params(100,100) => isYes==true',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 100, 100, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(true,0,{from:employee3});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),3,'yes');
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),3,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(true,0,{from:employee4});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),4,'yes');
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),4,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');	

		await voting.vote(true,0,{from:employee5});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),5,'yes');
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),5,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');			
	});

	global.it('2. Scenario: 5 employees, 1/5 voted yes, params(10,100) => isYes==true',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 10, 100, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		
		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		global.assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 10'); 
		global.assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100'); 

		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),1,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');	
	});	

	global.it('3. Scenario: 5 employees, 1/5 voted no, params(10,100) => isYes==false, isFinished==true',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 10, 100, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		
		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		global.assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 10'); 
		global.assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 100'); 

		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),0,'yes');
		global.assert.equal(r2[1].toNumber(),1,'no');
		global.assert.equal(r2[2].toNumber(),1,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');	
	});	

	global.it('4. Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,10) => isYes==true',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 100, 10, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		let quorumPercent = await voting.quorumPercent();
		let consensusPercent = await voting.consensusPercent();
		global.assert.equal(quorumPercent.toNumber(), 10, 'quorumPercent should be 100'); 
		global.assert.equal(consensusPercent.toNumber(), 100, 'consensusPercent should be 10'); 

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),1,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),2,'no');
		global.assert.equal(r2[2].toNumber(),3,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),3,'no');
		global.assert.equal(r2[2].toNumber(),4,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');	

		await voting.vote(false,0,{from:employee5});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),4,'no');
		global.assert.equal(r2[2].toNumber(),5,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');	
	});

	global.it('5. Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,20) => isYes==true',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 100, 20, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),1,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),2,'no');
		global.assert.equal(r2[2].toNumber(),3,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),3,'no');
		global.assert.equal(r2[2].toNumber(),4,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');	

		await voting.vote(false,0,{from:employee5});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),4,'no');
		global.assert.equal(r2[2].toNumber(),5,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');	
	});

	global.it('6. Scenario: 5 employees, 1/5 voted yes, 4/5 voted no, params(100,21) => isYes==false',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 100, 21, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),1,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),2,'no');
		global.assert.equal(r2[2].toNumber(),3,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');

		await voting.vote(false,0,{from:employee4});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),3,'no');
		global.assert.equal(r2[2].toNumber(),4,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');	

		await voting.vote(false,0,{from:employee5});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),4,'no');
		global.assert.equal(r2[2].toNumber(),5,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');	
	});

	global.it('7. Scenario: 5 employees, 1/5 voted yes, 2/5 voted no, params(50,50) => isYes==false',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 50, 50, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),1,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),1,'yes');
		global.assert.equal(r2[1].toNumber(),2,'no');
		global.assert.equal(r2[2].toNumber(),3,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
	});

	global.it('8. Scenario: 5 employees, 2/5 voted yes, 1/5 voted no, params(50,50) => isYes==true',async() => {
		await aacInstance.setVotingParams("setRootWeiReceiver", VOTING_TYPE_1P1V, 0, fromUtf8("Employees"), 50, 50, 0);
		const wae = await WeiAbsoluteExpense.new(1000);
		await aacInstance.setRootWeiReceiverAuto(wae.address, {from:employee1});	

		const pa = await daoBase.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee2});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');
		global.assert.strictEqual(await voting.isFinished(),false,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is finished');
		
		await voting.vote(false,0,{from:employee3});
		r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');
		global.assert.equal(r2[1].toNumber(),1,'no');
		global.assert.equal(r2[2].toNumber(),3,'total');
		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');
	});		
});
