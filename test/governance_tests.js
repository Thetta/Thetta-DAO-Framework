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

	let token;
	let daoBase;

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});

		// add creator as first employee	
		await store.addGroup(KECCAK256("Employees"));
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
		let voting = await Voting_1p1v.new(daoBase.address, proposal.address, creator, 60*24, KECCAK256("Employees"), 0);
		
		// vote by first, check results  (getFinalResults, isFinished, isYes, etc) 
			
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:employee1});

		const r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');

		// // TODO: JUST FOR DEBUGGGGG!!! 
		// var(yesResults, noResults, totalResults) = getFinalResults();
		// return (totalResults>1); <------------------ isFinished()

		global.assert.strictEqual(await voting.isFinished(),true,'Voting should be finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is finished');
		
	});

	global.it('should create and use 1p1v voting while members change',async() => {
		// add 3 employees 

		// vote by first, check results  (getFinalResults, isFinished, isYes, etc) 
		
		// remove 2nd employee from the group 
		
		// vote by second, check results 
		
		// vote by second again, check results 
	});
});

global.contract('Voting_SimpleToken', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];

	let token;
	let daoBase;

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		daoBase = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});

		// add creator as first employee	
		await store.addGroup(KECCAK256("Employees"));
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

		await daoBase.allowActionByVoting("manageGroups", token.address);
		await daoBase.allowActionByVoting("issueTokens", token.address);
	});
	
	global.it('should create and use simple token voting',async() => {
		// TODO:
	});

});

