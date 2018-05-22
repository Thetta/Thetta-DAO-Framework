var MicrocompanyWithUnpackers = artifacts.require("./MicrocompanyWithUnpackers");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");
var AutoMicrocompanyActionCaller = artifacts.require("./AutoMicrocompanyActionCaller");
var MicrocompanyWithUnpackers = artifacts.require("./MicrocompanyWithUnpackers");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

global.contract('Microcompany', (accounts) => {
	let token;
	let store;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	global.beforeEach(async() => {
	
		token = await StdMicrocompanyToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await MicrocompanyStorage.new(token.address,{gas: 10000000, from: creator});

		mcInstance = await MicrocompanyWithUnpackers.new(store.address,{gas: 10000000, from: creator});

		{
			// add creator as first employee	
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			// manually setup the Default organization permissions
			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
			await store.allowActionByAnyMemberOfGroup("startTask","Employees");
			await store.allowActionByAnyMemberOfGroup("startBounty","Employees");
			await store.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

			// this is a list of actions that require voting
			await store.addActionByVoting("manageGroups", token.address);
			await store.addActionByVoting("addNewTask", token.address);
			await store.addActionByVoting("issueTokens", token.address);
			await store.addActionByVoting("upgradeMicrocompany", token.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);
	});

	global.it('should set everything correctly',async() => {
		const isMember = await store.isGroupMember("Employees", creator);
		global.assert.equal(isMember,true,'Permission should be set correctly');

		const isMember2 = await store.isGroupMember("Employees", employee1);
		global.assert.equal(isMember2,false,'Permission should be set correctly');

		///
		const isCan = await store.isCanDoByGroupMember("addNewProposal", "Employees");
		global.assert.equal(isCan,true,'Permission should be set correctly');

		const isMajority = await mcInstance.isInMajority(creator, token.address);
		global.assert.strictEqual(isMajority,true,'Creator should be in majority');

		const isMajority2 = await mcInstance.isInMajority(employee1, token.address);
		global.assert.strictEqual(isMajority2,false,'Employee should not be in majority');
	});

	global.it('should return correct permissions for an outsider',async() => {
		const isCanDo1 = await mcInstance.isCanDoAction(outsider,"addNewProposal");
		const isCanDo2 = await mcInstance.isCanDoAction(outsider,"startTask");
		const isCanDo3 = await mcInstance.isCanDoAction(outsider,"startBounty");
		global.assert.strictEqual(isCanDo1,false,'Outsider should not be able to do that ');
		global.assert.strictEqual(isCanDo2,false,'Outsider should not be able to do that ');
		global.assert.strictEqual(isCanDo3,false,'Outsider should not be able to do that ');

		const isCanDo4 = await mcInstance.isCanDoAction(outsider,"manageGroups");
		const isCanDo5 = await mcInstance.isCanDoAction(outsider,"addNewTask");
		const isCanDo6 = await mcInstance.isCanDoAction(outsider,"issueTokens");
		global.assert.strictEqual(isCanDo4,false,'Outsider should not be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo5,false,'Outsider should not be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo6,false,'Outsider should not be able to do that because he is in majority');
	});

	global.it('should return correct permissions for creator',async() => {
		const isCanDo1 = await mcInstance.isCanDoAction(creator,"addNewProposal");
		const isCanDo2 = await mcInstance.isCanDoAction(creator,"startTask");
		const isCanDo3 = await mcInstance.isCanDoAction(creator,"startBounty");
		global.assert.strictEqual(isCanDo1,true,'Creator should be able to do that ');
		global.assert.strictEqual(isCanDo2,true,'Creator should be able to do that ');
		global.assert.strictEqual(isCanDo3,true,'Creator should be able to do that ');

		const isCanDo4 = await mcInstance.isCanDoAction(creator,"manageGroups");
		const isCanDo5 = await mcInstance.isCanDoAction(creator,"addNewTask");
		const isCanDo6 = await mcInstance.isCanDoAction(creator,"issueTokens");
		global.assert.strictEqual(isCanDo4,true,'Creator should be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo5,true,'Creator should be able to do that because he is in majority');
		global.assert.strictEqual(isCanDo6,true,'Creator should be able to do that because he is in majority');
	});

	global.it('should not add new vote if not employee',async() => {
		// employee1 is still not added to Microcompany as an employee
		let newProposal = 0x123;
		await CheckExceptions.checkContractThrows(mcInstance.addNewProposal.sendTransaction,
			[newProposal, { from: employee1}],
			'Should not add new proposal because employee1 has no permission');
	});

	global.it('should issue tokens to employee1 and employee2',async() => {
		await mcInstance.issueTokens(employee1,1000,{from: creator});
		await mcInstance.issueTokens(employee2,1000,{from: creator});

		const isMajority1 = await mcInstance.isInMajority(creator, token.address);
		global.assert.strictEqual(isMajority1,false,'Creator should NOT be in majority now');

		const isMajority2 = await mcInstance.isInMajority(employee1, token.address);
		global.assert.strictEqual(isMajority2,false,'employee1 is now in majority');

		const isMajority3 = await mcInstance.isInMajority(employee2, token.address);
		global.assert.strictEqual(isMajority3,false,'employee1 is now in majority');

		// CHECK this .at syntax!!!
		const balance1 = await token.balanceOf(creator);
		global.assert.equal(balance1,1000,'initial balance');

		const balance2 = await token.balanceOf(employee1);
		global.assert.equal(balance2,1000,'employee1 balance');
		
		const balance3 = await token.balanceOf(employee2);
		global.assert.equal(balance3,1000,'employee2 balance');
	});

	global.it('should be able to upgrade',async() => {
		let token = await StdMicrocompanyToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await MicrocompanyStorage.new(token.address,{gas: 10000000, from: creator});

		let mcInstance = await MicrocompanyWithUnpackers.new(store.address,{gas: 10000000, from: creator});

		await store.addGroup("Employees");
		await store.addGroupMember("Employees", creator);

		await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
		await store.allowActionByAnyMemberOfGroup("manageGroups","Employees");
		await store.allowActionByAnyMemberOfGroup("issueTokens","Employees");
		await store.allowActionByAnyMemberOfGroup("upgradeMicrocompany","Employees");

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		// Start
		let mcInstanceNew = await MicrocompanyWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		await mcInstance.upgradeMicrocompanyContract(mcInstanceNew.address, {gas: 10000000, from: creator});

		await mcInstanceNew.issueTokens(employee1,1000,{from: creator});

		// TODO: check employee1 balance

		await mcInstanceNew.addGroupMember("Employees", employee1,{from: creator});
		const isEmployeeAdded = await mcInstanceNew.isGroupMember("Employees",employee1);
		global.assert.strictEqual(isEmployeeAdded,true,'employee1 should be added as the company`s employee');

		await CheckExceptions.checkContractThrows(mcInstance.addGroupMember,
			["Employees", employee2, { from: creator}],
			'Should not add new employee to old MC');

		await CheckExceptions.checkContractThrows(mcInstance.issueTokens,
			[employee2, { from: creator}],
			'Should not issue tokens through MC');
	});
});

