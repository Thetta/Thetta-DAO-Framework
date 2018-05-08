var Microcompany = artifacts.require("./Microcompany");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");
var AddNewTaskVote = artifacts.require("./AddNewTaskVote");

var CheckExceptions = require('./utils/checkexceptions');

// 2 - Functions
deployMc = () => {
     var mc;

     return Microcompany.new(0x0,{gas: 10000000}).then((out) => {
          mc = out;
     }).then(() => {
          return Promise.resolve(mc);
     });
}

global.contract('Microcompany', (accounts) => {
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		const mcStorageAddress = mcStorage.address;

		mcInstance = await Microcompany.new(mcStorageAddress,{gas: 10000000, from: creator});
	});

	global.it('should return correct permissions',async() => {
		const isCan = await mcStorage.isCanDoByEmployee("addNewVote");
		global.assert.strictEqual(isCan,true,'Permission should be set correctly');

		const isMajority = await mcInstance.isInMajority(creator);
		global.assert.strictEqual(isMajority,true,'Creator should be in majority');

		const isMajority2 = await mcInstance.isInMajority(employee1);
		global.assert.strictEqual(isMajority2,false,'Employee should not be in majority');

		const isEmployeeByDefault = await mcInstance.isEmployee(creator);
		global.assert.strictEqual(isEmployeeByDefault,true,'Creator should be a first employee');
	});

	global.it('should not add new vote if not employee',async() => {
		// employee1 is still not added to Microcompany as an employee
		let newVote = 0x123;
		await CheckExceptions.checkContractThrows(mcInstance.addNewVote.sendTransaction,
			[newVote, { from: employee1}],
			'Should not add new vote because employee1 has no permission');
	});

	global.it('should add new vote by creator',async() => {
		let vote1 = await AddNewTaskVote.new(mcInstance.address,"SampleTaskCaption","SomeTaskDescription",false,false,100,
			{gas: 10000000, from: creator}
		);
		await mcInstance.addNewVote(vote1.address);
	});

});

