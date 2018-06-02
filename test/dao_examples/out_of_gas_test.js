var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var OutOfGasTEST = artifacts.require("./OutOfGasTEST"); 

var CheckExceptions = require('../utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

global.contract('OutOfGasTEST', (accounts) => {
	let token;
	let store;
	let daoBase;

	const creator = accounts[0];

	global.beforeEach(async() => {

	});

	global.it('should create Boss -> Managers -> Employees hierarchy using HierarchyDaoFactory and do not throw out-of-gas error',async() => {
		let ogt = OutOfGasTEST.new({gas: 15000000, from: creator});
	});
});

