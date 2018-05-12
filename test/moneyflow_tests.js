var Microcompany = artifacts.require("./Microcompany");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");
var StdMicrocompanyToken = artifacts.require("./StdMicrocompanyToken");
var MoneyFlow = artifacts.require("./MoneyFlow");

var CheckExceptions = require('./utils/checkexceptions');

global.contract('Moneyflow', (accounts) => {
	let mcStorage;
	let mcInstance;
	let moneyflowInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		// issue 1000 tokens
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
		//mcInstance.setAutoActionCallerAddress(aacInstance.address);
		moneyflowInstance = await MoneyFlow.new({from: creator});
	});

	global.it('should allow to get donations',async() => {
		// TODO: write test
	});

	global.it('should allow to send revenue',async() => {
		const revEndpoint = await moneyflowInstance.getRevenueEndpointAddress();
		global.assert.notStrictEqual(revEndpoint,0x0,'Endpoint should be created');

		// TODO:
	});
});

