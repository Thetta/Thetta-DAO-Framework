

/*
// TODO:
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

	global.it('should create and use simple token voting',async() => {
		// TODO:
	});
});
*/

