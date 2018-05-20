var MicrocompanyWithUnpackers = artifacts.require("./MicrocompanyWithUnpackers");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

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
			// manually setup the Default organization 
			await store.addActionByEmployeesOnly("addNewProposal");
			await store.addActionByEmployeesOnly("startTask");
			await store.addActionByEmployeesOnly("startBounty");
			await store.addActionByEmployeesOnly("modifyMoneyscheme");

			// this is a list of actions that require voting
			await store.addActionByVoting("addNewEmployee", token.address);
			await store.addActionByVoting("removeEmployee", token.address);
			await store.addActionByVoting("addNewTask", token.address);
			await store.addActionByVoting("issueTokens", token.address);
			await store.addActionByVoting("upgradeMicrocompany", token.address);

			// add creator as first employee	
			await store.addNewEmployee(creator);			
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);
	});

	global.it('should set everything correctly',async() => {
		///
		const isCan = await store.isCanDoByEmployee("addNewProposal");
		global.assert.equal(isCan,true,'Permission should be set correctly');

		const isMajority = await mcInstance.isInMajority(creator, token.address);
		global.assert.strictEqual(isMajority,true,'Creator should be in majority');

		const isMajority2 = await mcInstance.isInMajority(employee1, token.address);
		global.assert.strictEqual(isMajority2,false,'Employee should not be in majority');

		const isEmployeeByDefault = await mcInstance.isEmployee(creator);
		global.assert.strictEqual(isEmployeeByDefault,true,'Creator should be a first employee');
	});

	global.it('should return correct permissions for an outsider',async() => {
		const isCanDo1 = await mcInstance.isCanDoAction(outsider,"addNewProposal");
		const isCanDo2 = await mcInstance.isCanDoAction(outsider,"startTask");
		const isCanDo3 = await mcInstance.isCanDoAction(outsider,"startBounty");
		global.assert.strictEqual(isCanDo1,false,'Outsider should not be able to do that ');
		global.assert.strictEqual(isCanDo2,false,'Outsider should not be able to do that ');
		global.assert.strictEqual(isCanDo3,false,'Outsider should not be able to do that ');

		const isCanDo4 = await mcInstance.isCanDoAction(outsider,"addNewEmployee");
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

		const isCanDo4 = await mcInstance.isCanDoAction(creator,"addNewEmployee");
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
		// TODO: 
		//
		// 1 - create new Microcompany
		
		// 2 - 
		// TODO: call upgradeMicrocompanyContract method	
		
		// 3 - check that everything works fine with new contract (issue tokens, etc)
	});
});

