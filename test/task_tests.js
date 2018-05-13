var WeiTask = artifacts.require("./WeiTask");
var WeiBounty = artifacts.require("./WeiBounty");
var Microcompany = artifacts.require("./Microcompany");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

var AutoActionCaller = artifacts.require("./AutoActionCaller");
var CheckExceptions = require('./utils/checkexceptions');


global.contract('0.Tasks: prepaid positive scenario. Task created by creator', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

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
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
	});

	global.it('N1. should not create weiTask (prepaid + donation)',async() => {
		firstContractBalance = await web3.eth.getBalance(mcInstance.address)
		global.assert.strictEqual(firstContractBalance.toNumber(),0)

		firstEmployeeBalance = await web3.eth.getBalance(employee1)
		global.assert.strictEqual(firstEmployeeBalance.toNumber(),100000000000000000000)

		firstCreatorBalance = await web3.eth.getBalance(creator)

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
		
		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETH, {value:ETH});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

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

		secondCreatorBalance = await web3.eth.getBalance(creator)
		let creatorDelta = firstCreatorBalance.sub(secondCreatorBalance)
		console.log('creatorDelta T0.2:', creatorDelta.toString())
	});

	global.it('T0.3. should become "InProgress" after employee have started task',async() => {
		let th = await task.startTask(employee1);
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);

		secondCreatorBalance = await web3.eth.getBalance(creator)
		let creatorDelta = firstCreatorBalance.sub(secondCreatorBalance)
		console.log('creatorDelta T0.3:', creatorDelta.toString())
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
		
		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);

		secondCreatorBalance = await web3.eth.getBalance(creator)
		let creatorDelta = firstCreatorBalance.sub(secondCreatorBalance)
		console.log('creatorDelta T0.4:', creatorDelta.toString())
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

		secondCreatorBalance = await web3.eth.getBalance(creator)
		let creatorDelta = firstCreatorBalance.sub(secondCreatorBalance)
		console.log('creatorDelta T0.5:', creatorDelta.toString())		
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
		console.log('secondContractBalance:', secondContractBalance.toNumber())

		secondEmployeeBalance = await web3.eth.getBalance(employee1)
		let employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber()
		// global.assert.strictEqual(secondEmployeeBalance.toNumber(),0)
		global.assert.strictEqual(employeeDelta > 950000000000000000 ,true)
		console.log('employeeDelta:', employeeDelta)	

		secondCreatorBalance = await web3.eth.getBalance(creator)
		let creatorDelta = firstCreatorBalance.sub(secondCreatorBalance)
		console.log('creatorDelta T0.6:', creatorDelta.toString())

	});

});
6267824700000010000

global.contract('1.Tasks: postpaid positive scenario with UNKNOWN price. Task created by creator', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
	});

	global.it('T1.1. should create weiTask',async() => {
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

		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),0,'Should be 0');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 4);
	});

	global.it('T1.4. should become "Completed" after creator calls evaluateAndSetNeededWei()',async() => {

		let th = await task.evaluateAndSetNeededWei(ETH, {from:creator});

		let neededWei = await task.neededWei();
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

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETH, {value:ETH});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

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
	})	
});


global.contract('2.Tasks: postpaid positive scenario with KNOWN price. Task created by creator', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
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

		let neededWei = await task.neededWei();
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

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETH, {value:ETH});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

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
	})	
});


global.contract('2.Tasks: postpaid positive scenario with KNOWN price. Task created by creator', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
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

		let neededWei = await task.neededWei();
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

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETH, {value:ETH});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

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
	})	
});


global.contract('3.Tasks: donation positive scenario. Task created by creator', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
	});

	global.it('T3.1. should create weiTask',async() => {
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

		let neededWei = await task.neededWei();
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

		let isMoneyReceived = await task.isMoneyReceived();
		// global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETH, {value:ETH});

		let isMoneyReceived2 = await task.isMoneyReceived();
		// global.assert.strictEqual(isMoneyReceived2, true);

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
	})	
});


global.contract('4.Tasks: cancel on init state.', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,1000,{gas: 10000000, from: creator});
	});

	global.it('T4.1. should create weiTask',async() => {
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
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address, 1000,{gas: 10000000, from: creator});
	});

	global.it('T5.1. should create weiTask',async() => {
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
		
		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETH, {value:ETH});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

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
