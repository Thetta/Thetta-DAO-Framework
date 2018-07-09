var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");

// to check how upgrade works with IDaoBase clients
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");
var IProposal = artifacts.require("./IProposal");
// var DaoBaseTest = artifacts.require("./DaoBaseTest"); 
// var DaoBaseWithUnpackersTest = artifacts.require("./DaoBaseWithUnpackersTest"); 
var Splitter = artifacts.require("./Splitter");
var SplitterSimple = artifacts.require("./SplitterSimple");
var MoneyflowCentral = artifacts.require("./MoneyflowCentral");

// var MoneyflowCentral2 = artifacts.require("./MoneyflowCentral2");

var SplitterStorage = artifacts.require("./SplitterStorage");
var SplitterMain = artifacts.require("./SplitterMain");
var WeiTopDownSplitter = artifacts.require("./WeiTopDownSplitter");
var WeiUnsortedSplitter = artifacts.require("./WeiUnsortedSplitter");


var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

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

	/*global.it('Should estimate gas for WeiTopDownSplitter',async() => {
		var b1 = await web3.eth.getBalance(creator);
		var td = await WeiTopDownSplitter.new('a',{from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		var td = await WeiTopDownSplitter.new('a',{from: creator, gasPrice:1})
		var b3 = await web3.eth.getBalance(creator);
		var td = await WeiTopDownSplitter.new('a',{from: creator, gasPrice:1})
		var b4 = await web3.eth.getBalance(creator);
		var td = await WeiTopDownSplitter.new('a',{from: creator, gasPrice:1})
		var b5 = await web3.eth.getBalance(creator);
		var td = await WeiTopDownSplitter.new('a',{from: creator, gasPrice:1})
		console.log('WeiTopDownSplitter 1:', b1.toNumber() - b2.toNumber());
		console.log('WeiTopDownSplitter 2:', b2.toNumber() - b3.toNumber());
		console.log('WeiTopDownSplitter 3:', b3.toNumber() - b4.toNumber());
		console.log('WeiTopDownSplitter 4:', b4.toNumber() - b5.toNumber());
	});

	global.it('Should estimate gas for WeiUnsortedSplitter',async() => {
		var b1 = await web3.eth.getBalance(creator);
		var td = await WeiUnsortedSplitter.new('a',{from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		var td = await WeiUnsortedSplitter.new('a',{from: creator, gasPrice:1})
		var b3 = await web3.eth.getBalance(creator);
		var td = await WeiUnsortedSplitter.new('a',{from: creator, gasPrice:1})
		var b4 = await web3.eth.getBalance(creator);
		var td = await WeiUnsortedSplitter.new('a',{from: creator, gasPrice:1})
		var b5 = await web3.eth.getBalance(creator);
		var td = await WeiUnsortedSplitter.new('a',{from: creator, gasPrice:1})
		console.log('WeiUnsortedSplitter 1:', b1.toNumber() - b2.toNumber());
		console.log('WeiUnsortedSplitter 2:', b2.toNumber() - b3.toNumber());
		console.log('WeiUnsortedSplitter 3:', b3.toNumber() - b4.toNumber());
		console.log('WeiUnsortedSplitter 4:', b4.toNumber() - b5.toNumber());
	});	

	global.it('Should estimate gas for MoneyflowCentral',async() => {
		var b1 = await web3.eth.getBalance(creator);
		moneyflowCentral = await MoneyflowCentral.new({from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		console.log('Estimate gas setNewConnection:', await moneyflowCentral.setNewConnection.estimateGas(0, [1,2], {from: creator, gasPrice:1}));
		await moneyflowCentral.setNewConnection(0, [1,2], {from: creator, gasPrice:1});
		var b3 = await web3.eth.getBalance(creator);
		await moneyflowCentral.setNewOutput(1, employee1, {from: creator, gasPrice:1});
		var b4 = await web3.eth.getBalance(creator);
		
		console.log('Estimate gas setNewOutput:', await moneyflowCentral.setNewOutput.estimateGas(2, employee2, {from: creator, gasPrice:1}));
		await moneyflowCentral.setNewOutput(2, employee2, {from: creator, gasPrice:1});
		
		var b5 = await web3.eth.getBalance(creator);
		console.log('MoneyflowCentral: contract ', b1.toNumber() - b2.toNumber());
		console.log('MoneyflowCentral: setNewNode', b2.toNumber() - b3.toNumber());
		console.log('MoneyflowCentral: setNewOutput', b3.toNumber() - b4.toNumber());
		console.log('MoneyflowCentral: setNewOutput', b4.toNumber() - b5.toNumber());	
	});

	global.it('Should estimate gas for MoneyflowCentral2',async() => {
		var b1 = await web3.eth.getBalance(creator);
		moneyflowCentral = await MoneyflowCentral2.new({from: creator, gasPrice:1});
		var b2 = await web3.eth.getBalance(creator);
		await moneyflowCentral.setMoneyflowNode(0, [1,2], 0, true, '0x0', {from: creator, gasPrice:1});
		var b3 = await web3.eth.getBalance(creator);
		await moneyflowCentral.setMoneyflowNode(1, [3,4], 0, true, '0x0', {from: creator, gasPrice:1});
		var b4 = await web3.eth.getBalance(creator);
		await moneyflowCentral.setMoneyflowNode(2, [5,6], 0, true, '0x0', {from: creator, gasPrice:1});
		var b5 = await web3.eth.getBalance(creator);
		console.log('MoneyflowCentral2: contract ', b1.toNumber() - b2.toNumber());
		console.log('Estimate gas setMoneyflowNode:', await moneyflowCentral.setMoneyflowNode.estimateGas(0, [1,2], 0, true, '0x0', {from: creator, gasPrice:1}));
		console.log('MoneyflowCentral2: setNewNode', b2.toNumber() - b3.toNumber());
		console.log('MoneyflowCentral2: setNewOutput', b3.toNumber() - b4.toNumber());
		console.log('MoneyflowCentral2: setNewOutput', b4.toNumber() - b5.toNumber());	
	});	

	global.it('Should estimate gas for SplitterSimple',async() => {
		var b1 = await web3.eth.getBalance(creator);
		await SplitterSimple.new([employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		await SplitterSimple.new([employee3], {from: creator, gasPrice:1})
		var b3 = await web3.eth.getBalance(creator);
		await SplitterSimple.new([employee3, employee4], {from: creator, gasPrice:1})
		var b4 = await web3.eth.getBalance(creator);
		await SplitterSimple.new([employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b5 = await web3.eth.getBalance(creator);
		await SplitterSimple.new([employee2, employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b6 = await web3.eth.getBalance(creator);
		await SplitterSimple.new([employee1, employee2, employee3, employee4, employee5], {from: creator, gasPrice:1})
		var b7 = await web3.eth.getBalance(creator);		
		console.log('SplitterSimple gas (first deploy):', b1.toNumber() - b2.toNumber());
		console.log('SplitterSimple gas (1 child):', b2.toNumber() - b3.toNumber());
		console.log('SplitterSimple gas (2 children):', b3.toNumber() - b4.toNumber());
		console.log('SplitterSimple gas (3 children):', b4.toNumber() - b5.toNumber());
		console.log('SplitterSimple gas (4 children):', b5.toNumber() - b6.toNumber());
		console.log('SplitterSimple gas (5 children):', b6.toNumber() - b7.toNumber());
	});

	global.it('Should estimate gas for Splitter with Lib',async() => {
		var b1 = await web3.eth.getBalance(creator);
		await Splitter.new('a', {from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		await Splitter.new('a', {from: creator, gasPrice:1})
		var b3 = await web3.eth.getBalance(creator);
		await Splitter.new('a', {from: creator, gasPrice:1})
		var b4 = await web3.eth.getBalance(creator);
		await Splitter.new('a', {from: creator, gasPrice:1})
		var b5 = await web3.eth.getBalance(creator);
		await Splitter.new('a', {from: creator, gasPrice:1})
		var b6 = await web3.eth.getBalance(creator);
		await Splitter.new('a', {from: creator, gasPrice:1})
		var b7 = await web3.eth.getBalance(creator);		
		console.log('Splitter gas :', b1.toNumber() - b2.toNumber());
		console.log('Splitter gas :', b2.toNumber() - b3.toNumber());
		console.log('Splitter gas :', b3.toNumber() - b4.toNumber());
		console.log('Splitter gas :', b4.toNumber() - b5.toNumber());
		console.log('Splitter gas :', b5.toNumber() - b6.toNumber());
		console.log('Splitter gas :', b6.toNumber() - b7.toNumber());
	});

	global.it('Should estimate gas for SplitterStorage + SplitterMain',async() => {
		var b1 = await web3.eth.getBalance(creator);
		let splitterMain = await SplitterMain.new({from: creator, gasPrice:1})
		var b2 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, 'a', {from: creator, gasPrice:1});
		var b3 = await web3.eth.getBalance(creator);

		await SplitterStorage.new(splitterMain.address, 'a', {from: creator, gasPrice:1});
		var b4 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, 'a', {from: creator, gasPrice:1});
		var b5 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, 'a', {from: creator, gasPrice:1});
		var b6 = await web3.eth.getBalance(creator);
		await SplitterStorage.new(splitterMain.address, 'a', {from: creator, gasPrice:1});
		var b7 = await web3.eth.getBalance(creator);

		console.log('SplitterMain gas:', b1.toNumber() - b2.toNumber());
		console.log('SplitterStorage gas (1 child):', b2.toNumber() - b3.toNumber());
		console.log('SplitterStorage gas (2 children):', b3.toNumber() - b4.toNumber());
		console.log('SplitterStorage gas (3 children):', b4.toNumber() - b5.toNumber());
		console.log('SplitterStorage gas (4 children):', b5.toNumber() - b6.toNumber());
		console.log('SplitterStorage gas (5 children):', b6.toNumber() - b7.toNumber());
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
		// var daoBaseOld = await DaoBaseWithUnpackersTest.new(store1.address,{gas: 10000000, from: employee1, gasPrice:1});
		var b2 = await web3.eth.getBalance(employee1);
		// var daoBaseNew = await DaoBaseWithUnpackers.new(store2.address,{gas: 10000000, from: employee1, gasPrice:1});
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
	});*/
});

