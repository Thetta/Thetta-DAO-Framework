var MicrocompanyWithUnpackers = artifacts.require("./MicrocompanyWithUnpackers");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

// TODO: 
// Experimental 
global.contract('Governance Schemes', (accounts) => {
	let token;
	let store;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	global.beforeEach(async() => {

	});

	// addNewProposal - any member of "BoD" can add new proposal 
	// issueTokens - all members of "BoD" should be able to issueTokens BY VOTING (1p1v)
	global.it('scheme1',async() => {
		token = await StdMicrocompanyToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await MicrocompanyStorage.new(token.address,{gas: 10000000, from: creator});

		mcInstance = await MicrocompanyWithUnpackers.new(store.address,{gas: 10000000, from: creator});

		{
			// EXPERIMENTAL Permissions:
			/*
			await store.allowActionByAddress("manageGroups",creator);

			await store.addGroup("BoD");
			await store.addMemberToGroup("BoD", creator);

			await store.addGroup("Employees");
			await store.addMemberToGroup("Employees", creator);

			await store.allowActionByAnyMemberOfGroup("addNewProposal","BoD");
			*/
			
			/*
			// Example1: any token holder can vote on issueTokens
			// set 1p1v type of vote
			await store.allowActionByVoting("issueTokens", token.address);
			await aac.setVotingType("issueTokens","1p1v", 0x0);

			// Example2: any token holder can vote on issueTokens
			// set "simple_coin" type of vote
			await store.allowActionByVoting("issueTokens", token.address);
			await aac.setVotingType("issueTokens","simple_coin", token.address);

			/*
			// Example3: only particular group (BoD members) can vote on issueTokens
			// set "simple_coin" type of vote
			await store.allowActionByVoting("issueTokens", token.address);
			await aac.setVotingTypeForPermission("issueTokens","simple_coin", token.address);
			await aac.restrictGroupForPermission("issueTokens","BoD");

			// Example4: any token holder can vote on issueTokens
			// set "simple_coin" type of vote
			await store.allowActionByVoting("issueTokens", token.address);
			await aac.setVotingType("issueTokens","simple_coin", token.address);
			*/

			/*
			// Example5: any token holder can vote on issueTokens
			// but particular group (BoD members) can block the proposal
			// 
			await store.allowActionByVoting("issueTokens", token.address);
			await aac.setVotingTypeForPermission("issueTokens","1p1v_block", token.address);
			await aac.restrictGroupForPermission("issueTokens","BoD");
			*/
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);
	});

});
