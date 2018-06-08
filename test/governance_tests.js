var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var Voting_1p1v = artifacts.require("./Voting_1p1v");
var IProposal = artifacts.require("./IProposal");
var InformalProposal = artifacts.require("./InformalProposal");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

global.contract('Voting_1p1v', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const employee4 = accounts[4];
	const employee5 = accounts[5];

	let token;
	let daoBase;

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});

		daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});

		// add creator as first employee	
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

		await daoBase.allowActionByVoting("manageGroups", token.address);
		await daoBase.allowActionByVoting("issueTokens", token.address);
	});
	
	global.it('should create and use 1p1v voting',async() => {
		// add 3 employees
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);

		let proposal = await InformalProposal.new('Take the money and run', {from:creator, gas:10000000, gasPrice:0});	
		let voting = await Voting_1p1v.new(daoBase.address, proposal.address, creator, 0, "Employees", 67, 50, 0);
		
		// vote by first, check results  (getVotingStats, isFinished, isYes, etc) 
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(false,0,{from:employee2});

		var r2 = await voting.getVotingStats();
		global.assert.equal(r2[0].toNumber(),1,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),1,'no');

		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee1});

		var r2 = await voting.getVotingStats();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),1,'no');
		

		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished: 3/4 voted');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished: 3/4 voted, 2/3 said yes');
	});

	global.it('should create and use 1p1v voting while members change',async() => {
		// add 5 employees 
		await daoBase.addGroupMember("Employees", employee1);
		await daoBase.addGroupMember("Employees", employee2);
		await daoBase.addGroupMember("Employees", employee3);
		await daoBase.addGroupMember("Employees", employee4);
		await daoBase.addGroupMember("Employees", employee5);

		let proposal = await InformalProposal.new('Take the money and run again', {from:creator, gas:10000000, gasPrice:0});	
		let voting = await Voting_1p1v.new(daoBase.address, proposal.address, creator, 0, "Employees", 51, 50, 0);
	
		// vote by first, check results  (getVotingStats, isFinished, isYes, etc) 	
		await voting.vote(true,0,{from:employee1});
		
		var r2 = await voting.getVotingStats();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),6,'creator + 5 employee');

		await daoBase.removeGroupMember("Employees", employee1);
		// remove 2nd employee from the group 

		var r2 = await voting.getVotingStats();
		global.assert.equal(r2[0].toNumber(),1,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),5,'creator + 4 employee');
		
		await voting.vote(true,0,{from:employee2});

		var r2 = await voting.getVotingStats();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		
		await CheckExceptions.checkContractThrows(
			voting.vote, [true,0,{from:employee2}]);
	
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee3});	

		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished: 4/6 voted');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished: 4/6 voted, all said yes');					
		await daoBase.removeGroupMember("Employees", employee3);

		// WARNING:
		// if voting is finished -> even if we remove some employees from the group 
		// the voting results should not be changed!!!
		// 
		// BUT the 'getVotingStats()' will return different results
		var emps = await daoBase.getMembersCount("Employees");
		global.assert.equal(4, emps, '4 employees');

		var res = await voting.getVotingStats();
		global.assert.strictEqual(res[0].toNumber(),2,'');
		global.assert.strictEqual(res[1].toNumber(),0,'');

		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished: 4/6 voted');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished: 4/6 voted, all said yes');	
	});
});

