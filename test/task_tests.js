var WeiTask = artifacts.require("./WeiTask");
var WeiBounty = artifacts.require("./WeiBounty");
var Microcompany = artifacts.require("./Microcompany");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var CheckExceptions = require('./utils/checkexceptions');

let token;
let store;
let task;
let mcInstance;

async function setup(creator){
	token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
	await token.mint(creator, 1000);
	store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

	// issue 1000 tokens
	mcInstance = await Microcompany.new(store.address,{gas: 10000000, from: creator});

	{
		await store.addGroup("Employees");
		await store.addGroupMember("Employees", creator);

		await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
		await store.allowActionByAnyMemberOfGroup("startTask","Employees");
		await store.allowActionByAnyMemberOfGroup("startBounty","Employees");

		// this is a list of actions that require voting
		await store.allowActionByVoting("manageGroups",token.address);
		await store.allowActionByVoting("addNewTask",token.address);
		await store.allowActionByVoting("issueTokens",token.address);
	}

	// do not forget to transfer ownership
	await token.transferOwnership(mcInstance.address);
	await store.transferOwnership(mcInstance.address);

	//moneyflowInstance = await MoneyFlow.new({from: creator});
}

global.contract('0.Tasks: prepaid positive scenario. Task created by creator', (accounts) => {
	let firstContractBalance;
	let firstEmployeeBalance;
	let firstCreatorBalance;

	let secondContractBalance;
	let secondEmployeeBalance;
	let secondCreatorBalance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 1000000000000000000;

	global.beforeEach(async() => {
		await setup(creator);
	});

	global.it('N1. should not create weiTask (prepaid + donation)',async() => {
		th = await CheckExceptions.checkContractThrows(WeiTask.new, 
			[mcInstance.address, 'Task Caption', 'Task description', false, true, ETH, {gas: 10000000, from: creator}]
		);
	});

	global.it('N2. should not create weiTask (prepaid + 0 Wei)',async() => {
		th = await CheckExceptions.checkContractThrows(WeiTask.new, 
			[mcInstance.address, 'Task Caption', 'Task description', false, false, 0, {gas: 10000000, from: creator}]
		);
	});

	global.it('T0.1. should create weiTask',async() => {
		firstContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(firstContractBalance.toNumber(),0)

		firstEmployeeBalance = await web3.eth.getBalance(employee1)
		global.assert.strictEqual(firstEmployeeBalance.toNumber(),100000000000000000000)

		firstCreatorBalance = await web3.eth.getBalance(creator)

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			{gas: 10000000, from: creator}
		);
	});

	global.it('N3. should not become "InProgress" before "Prepaid"',async() => {
		th = await CheckExceptions.checkContractThrows(task.startTask,
			[employee1, {gas: 10000000, from: employee1}]
		);
	});

	global.it('T0.2. should become "PrePaid" after transfer 1 ETH',async() => {
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(),0);
		
		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		let getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator)

		let th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator)

		let creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber()
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true)

		let getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);
		
		let isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, false);

		let status2 = await task.getCurrentState();
		global.assert.strictEqual(status2.toNumber(), 2);
	});

	global.it('T0.3. should become "InProgress" after employee have started task',async() => {
		let th = await task.startTask(employee1);
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);
	});

	global.it('N4. should not become "Completed" after outsider call',async() => {
		th = await CheckExceptions.checkContractThrows(task.notifyThatCompleted,
			[{gas: 10000000, from: outsider}]
		);
	});

	global.it('T0.4. should become "Completed" after employee have marked task as completed',async() => {
		let th = await task.notifyThatCompleted({from:employee1});
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
		
		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
	});

	global.it('N5. should not become "CanGetFunds" after outsider call',async() => {
		th = await CheckExceptions.checkContractThrows(task.confirmCompletion,
			[{gas: 10000000, from: outsider}]
		);
	});

	global.it('T0.5. should become "CanGetFunds" after creator have marked task as completed',async() => {
		let th = await task.confirmCompletion({from:creator});
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6);
	});

	global.it('N6. should not become "Finished" after outsider calls',async() => {
		await CheckExceptions.checkContractThrows(task.setOutput,
			[outsider,{gas: 10000000, from: outsider}]
		);

		await CheckExceptions.checkContractThrows(task.setOutput,
			[creator,{gas: 10000000, from: outsider}]
		);
	});

	global.it('T0.6. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1);
		let th = await task.flush();
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(secondContractBalance.toNumber(),0)

		secondEmployeeBalance = await web3.eth.getBalance(employee1)
		let employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber()
		global.assert.strictEqual(employeeDelta > 950000000000000000 ,true)
	});
});

global.contract('1.Tasks: postpaid positive scenario with UNKNOWN price. Task created by creator', (accounts) => {
	let task;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		await setup(creator);
	});

	global.it('T1.1. should create weiTask',async() => {
		firstContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(firstContractBalance.toNumber(),0)

		firstEmployeeBalance = await web3.eth.getBalance(employee1)
		global.assert.strictEqual(firstEmployeeBalance.toNumber(),100000000000000000000)

		firstCreatorBalance = await web3.eth.getBalance(creator)

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			0,
			{gas: 10000000, from: creator}
		);
	});

	global.it('T1.2. should become "InProgress" after employee have started task',async() => {
		let th = await task.startTask(employee1);
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);
	});

	global.it('T1.3. should become "CompleteButNeedsEvaluation" after employee have marked task as completed',async() => {
		let th = await task.notifyThatCompleted({from:employee1});

		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),0,'Should be 0');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 4);
	});

	global.it('T1.4. should become "Completed" after creator calls evaluateAndSetNeededWei()',async() => {
		let th = await task.evaluateAndSetNeededWei(ETH, {from:creator});

		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be ETH');

		let isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, true);

		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
	});

	global.it('T1.4. should become "CanGetFunds" after creator calls processFunds()',async() => {
		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		let getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator)

		let th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator)

		let creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber()
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true)

		let getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);

		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6)		
	});

	global.it('T1.5. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1);
		let th = await task.flush();
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7)		

		secondContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(secondContractBalance.toNumber(),0)

		secondEmployeeBalance = await web3.eth.getBalance(employee1)
		let employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber()
		// global.assert.strictEqual(secondEmployeeBalance.toNumber(),0)
		global.assert.strictEqual(employeeDelta > 0.7*ETH ,true)
	})	
});

global.contract('2.Tasks: postpaid positive scenario with KNOWN price. Task created by creator', (accounts) => {
	let task;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		await setup(creator);
	});

	global.it('T2.1. should create weiTask',async() => {
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			ETH,
			{gas: 10000000, from: creator}
		);
	});

	global.it('T2.2. should become "InProgress" after employee have started task',async() => {
		let th = await task.startTask(employee1);
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);
	});

	global.it('T2.3. should become "Completed" after employee have marked task as completed',async() => {
		let th = await task.notifyThatCompleted({from:employee1});

		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be ETH');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
	});

	global.it('T2.4. should become "CanGetFunds" after creator calls processFunds()',async() => {

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		let getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator)

		let th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator)

		let creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber()
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true)

		let getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);

		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6);
	});

	global.it('T2.5. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1);
		let th = await task.flush();
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(secondContractBalance.toNumber(),0)

		secondEmployeeBalance = await web3.eth.getBalance(employee1)
		let employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber()
		// global.assert.strictEqual(secondEmployeeBalance.toNumber(),0)
		global.assert.strictEqual(employeeDelta > 0.7*ETH ,true)
	})	
});

global.contract('3.Tasks: donation positive scenario. Task created by creator', (accounts) => {
	let task;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		await setup(creator);
	});

	global.it('T3.1. should create weiTask',async() => {

		firstContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(firstContractBalance.toNumber(),0)

		firstEmployeeBalance = await web3.eth.getBalance(employee1)
		global.assert.strictEqual(firstEmployeeBalance.toNumber(),100000000000000000000)

		firstCreatorBalance = await web3.eth.getBalance(creator)

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			true,
			true,
			0,
			{gas: 10000000, from: creator}
		);
	});

	global.it('T3.2. should become "InProgress" after employee have started task',async() => {
		let th = await task.startTask(employee1);
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);
	});

	global.it('T3.3. should become "Completed" after creator calls evaluateAndSetNeededWei()',async() => {
		let th = await task.notifyThatCompleted({from:employee1});

		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),0,'Should be ETH');

		let isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, true);

		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
	});

	global.it('T3.4. should become "CanGetFunds" after creator calls processFunds()',async() => {

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		// global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		// global.assert.strictEqual(minWeiNeeded.toNumber(),0);

		let getIsMoneyReceived = await task.getIsMoneyReceived();
		// global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator)

		let th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator)

		let creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber()
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true)


		let getIsMoneyReceived2 = await task.getIsMoneyReceived();
		// global.assert.strictEqual(getIsMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		// global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		// global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		// global.assert.strictEqual(balance.toNumber(), ETH);

		let status = await task.getCurrentState();
		// global.assert.strictEqual(status.toNumber(), 6)		
	});

	global.it('T3.5. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1);
		let th = await task.flush();
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);
		
		secondContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(secondContractBalance.toNumber(),0)

		secondEmployeeBalance = await web3.eth.getBalance(employee1)
		let employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber()
		// global.assert.strictEqual(secondEmployeeBalance.toNumber(),0)
		global.assert.strictEqual(employeeDelta > 0.7*ETH ,true)
	})	
});

global.contract('4.Tasks: cancel on init state.', (accounts) => {
	let task;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		await setup(creator);
	});

	global.it('T4.1. should create weiTask',async() => {

		firstContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(firstContractBalance.toNumber(),0)

		firstEmployeeBalance = await web3.eth.getBalance(employee1)
		global.assert.strictEqual(firstEmployeeBalance.toNumber(),100000000000000000000)

		firstCreatorBalance = await web3.eth.getBalance(creator)

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			{gas: 10000000, from: creator}
		);
	});

	global.it('T4.2. should become "Cancelled"',async() => {
		th = await task.cancell({from:creator})
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 1);
	})	
});

global.contract('5.Tasks: cancel on prepaid state.', (accounts) => {
	let task;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		await setup(creator);
	});

	global.it('T5.1. should create weiTask',async() => {
		firstContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(firstContractBalance.toNumber(),0)

		firstEmployeeBalance = await web3.eth.getBalance(employee1)
		global.assert.strictEqual(firstEmployeeBalance.toNumber(),100000000000000000000)

		firstCreatorBalance = await web3.eth.getBalance(creator)		

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			{gas: 10000000, from: creator}
		);
	});

	global.it('T5.2. should become "PrePaid" after transfer 1 ETH',async() => {
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(),0);
		
		let neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		let getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator)

		let th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator)

		let creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber()
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true)


		let getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);
		
		let isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, false);

		let status2 = await task.getCurrentState();
		global.assert.strictEqual(status2.toNumber(), 2);
	});

	global.it('T5.2. should become "Cancelled"',async() => {
		th = await task.cancell({from:creator})
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 1);
	})	
});
