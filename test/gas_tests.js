var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");

// to check how upgrade works with IDaoBase clients
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var IProposal = artifacts.require("./IProposal");
var DaoBaseTest = artifacts.require("./DaoBaseTest"); 
var DaoBaseWithUnpackersTest = artifacts.require("./DaoBaseWithUnpackersTest"); 
var Splitter = artifacts.require("./Splitter") ;

var SplitterStorage = artifacts.require("./SplitterStorage");
var SplitterMain = artifacts.require("./SplitterMain");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

var SplitterM  = require('../migrations/2_deploy_contracts.js');
global.contract('Gas measurements', (accounts) => {
	let token;
	let store;
	let daoBase;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];
	const employee3 = accounts[4];
	const employee4 = accounts[5];
	const employee5 = accounts[6];

	global.beforeEach(async() => {
	});

	global.it('Should estimate gas for Splitter',async() => {
		var b1 = await web3.eth.getBalance(creator);
		await Splitter.new([employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		await Splitter.new([employee3], {from: creator, gasPrice:1})
		var b3 = await web3.eth.getBalance(creator);
		await Splitter.new([employee3, employee4], {from: creator, gasPrice:1})
		var b4 = await web3.eth.getBalance(creator);
		await Splitter.new([employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b5 = await web3.eth.getBalance(creator);
		await Splitter.new([employee2, employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b6 = await web3.eth.getBalance(creator);
		await Splitter.new([employee1, employee2, employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b7 = await web3.eth.getBalance(creator);		
		console.log('Splitter gas (first deploy):', b1.toNumber() - b2.toNumber());
		console.log('Splitter gas (1 child):', b2.toNumber() - b3.toNumber());
		console.log('Splitter gas (2 children):', b3.toNumber() - b4.toNumber());
		console.log('Splitter gas (3 children):', b4.toNumber() - b5.toNumber());
		console.log('Splitter gas (4 children):', b5.toNumber() - b6.toNumber());
		console.log('Splitter gas (5 children):', b6.toNumber() - b7.toNumber());
	});

	global.it('Should estimate gas for SplitterStorage',async() => {
		var b1 = await web3.eth.getBalance(creator);
		let splitterMain = await SplitterMain.new({from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, [employee3], {from: creator, gasPrice:1});
		var b3 = await web3.eth.getBalance(creator);

		await SplitterStorage.new(splitterMain.address, [employee3, employee4], {from: creator, gasPrice:1});
		var b4 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, [employee3, employee4, employee5], {from: creator, gasPrice:1});
		var b5 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, [employee2, employee3, employee4, employee5], {from: creator, gasPrice:1});
		var b6 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, [employee1, employee2, employee3, employee4, employee5], {from: creator, gasPrice:1});
		var b7 = await web3.eth.getBalance(creator);

		console.log('SplitterMain gas:', b1.toNumber() - b2.toNumber());
		console.log('Splitter gas (1 child):', b2.toNumber() - b3.toNumber());
		console.log('Splitter gas (2 children):', b3.toNumber() - b4.toNumber());
		console.log('Splitter gas (3 children):', b4.toNumber() - b5.toNumber());
		console.log('Splitter gas (4 children):', b5.toNumber() - b6.toNumber());
		console.log('Splitter gas (5 children):', b6.toNumber() - b7.toNumber());
	});


	global.it('Should estimate gas for daoBase',async() => {
		token1 = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token1.mint(creator, 1000);
		store1 = await DaoStorage.new([token1.address],{gas: 10000000, from: creator});

		token2 = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token2.mint(creator, 1000);
		store2 = await DaoStorage.new([token2.address],{gas: 10000000, from: creator});

		// add creator as first employee
		await store1.addGroupMember(KECCAK256("Employees"), creator);
		await store1.allowActionByAddress(KECCAK256("manageGroups"),creator);
		await store2.addGroupMember(KECCAK256("Employees"), creator);
		await store2.allowActionByAddress(KECCAK256("manageGroups"),creator);

		await web3.eth.sendTransaction({from:employee1, to: employee2, value:'10000000000000000000'});
		await web3.eth.sendTransaction({from:creator, to: employee2, value:'10000000000000000000'});
		//emplooyee now have 10 ETH

		var b1 = await web3.eth.getBalance(employee1);
		var daoBaseOld = await DaoBaseWithUnpackersTest.new(store1.address,{gas: 10000000, from: employee1, gasPrice:1});
		var b2 = await web3.eth.getBalance(employee1);
		var daoBaseNew = await DaoBaseWithUnpackers.new(store2.address,{gas: 10000000, from: employee1, gasPrice:1});
		var b3 = await web3.eth.getBalance(employee1);

		await token1.transferOwnership(daoBaseOld.address);
		await store1.transferOwnership(daoBaseOld.address);
		await token2.transferOwnership(daoBaseNew.address);
		await store2.transferOwnership(daoBaseNew.address);

		console.log('daoBaseOld:', await daoBaseOld.addGroupMember.estimateGas('Employees', employee1, {from:creator}))
		console.log('daoBaseNew:', await daoBaseNew.addGroupMember.estimateGas('Employees', employee1, {from:creator}))

		var c1 = await web3.eth.getBalance(creator);
		await daoBaseOld.addGroupMember('Employees', employee1, {from:creator, gasPrice:1})
		var c2 = await web3.eth.getBalance(creator);
		await daoBaseNew.addGroupMember('Employees', employee1, {from:creator, gasPrice:1})
		var c3 = await web3.eth.getBalance(creator);

		console.log('Old:', c1.toNumber()-c2.toNumber(), 'New:', c2.toNumber()-c3.toNumber());

		var c1 = await web3.eth.getBalance(creator);
		await daoBaseOld.addGroupMember('Employees', employee2, {from:creator, gasPrice:1})
		var c2 = await web3.eth.getBalance(creator);
		await daoBaseNew.addGroupMember('Employees', employee2, {from:creator, gasPrice:1})
		var c3 = await web3.eth.getBalance(creator);

		console.log('Old:', c1.toNumber()-c2.toNumber(), 'New:', c2.toNumber()-c3.toNumber());

		var c1 = await web3.eth.getBalance(creator);
		await daoBaseOld.addGroupMember('Employees', employee3, {from:creator, gasPrice:1})
		var c2 = await web3.eth.getBalance(creator);
		await daoBaseNew.addGroupMember('Employees', employee3, {from:creator, gasPrice:1})
		var c3 = await web3.eth.getBalance(creator);

		console.log('Old:', c1.toNumber()-c2.toNumber(), 'New:', c2.toNumber()-c3.toNumber());

		var c1 = await web3.eth.getBalance(creator);
		await daoBaseOld.addGroupMember('Employees', employee4, {from:creator, gasPrice:1})
		var c2 = await web3.eth.getBalance(creator);
		await daoBaseNew.addGroupMember('Employees', employee4, {from:creator, gasPrice:1})
		var c3 = await web3.eth.getBalance(creator);

		console.log('Old:', c1.toNumber()-c2.toNumber(), 'New:', c2.toNumber()-c3.toNumber());

		var c1 = await web3.eth.getBalance(creator);
		await daoBaseOld.addGroupMember('Employees', employee5, {from:creator, gasPrice:1})
		var c2 = await web3.eth.getBalance(creator);
		await daoBaseNew.addGroupMember('Employees', employee5, {from:creator, gasPrice:1})
		var c3 = await web3.eth.getBalance(creator);

		console.log('Old:', c1.toNumber()-c2.toNumber(), 'New:', c2.toNumber()-c3.toNumber());
		// global.assert.equal(true,false);
	});
});

