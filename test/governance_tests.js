var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var Voting_1p1v = artifacts.require("./Voting_1p1v");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

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

		{
			// add creator as first employee	
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

			await store.allowActionByVoting("manageGroups", token.address);
			await store.allowActionByVoting("issueTokens", token.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);
	});
	
	global.it('should create and use 1p1v voting',async() => {
		// add 3 employees 

		// vote by first, check results  (getFinalResults, isFinished, isYes, etc) 
		
		// vote by second, check results 
		
		// vote by second again, check results 
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

		{
			// add creator as first employee	
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

			await store.allowActionByVoting("manageGroups", token.address);
			await store.allowActionByVoting("issueTokens", token.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);
	});
	
	global.it('should create and use simple token voting',async() => {
		// TODO:
	});

});

