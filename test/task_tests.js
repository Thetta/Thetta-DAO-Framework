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

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETHdiv100 = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,{gas: 10000000, from: creator});
	});

	global.it('T0.1. should create weiTask',async() => {
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETHdiv100,
			{gas: 10000000, from: creator}
		);
	});

	global.it('T0.2. should become "PrePaid" after transfer 1 ETHdiv100',async() => {
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(),0);
		
		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be 1 ETHdiv100');

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETHdiv100);

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETHdiv100, {value:ETHdiv100});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETHdiv100);
		
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

	global.it('T0.4. should become "Completed" after employee have marked task as completed',async() => {
		let th = await task.notifyThatCompleted({from:employee1});
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
		
		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be 1 ETHdiv100');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
	});

	global.it('T0.5. should become "CanGetFunds" after creator have marked task as completed',async() => {
		let th = await task.confirmCompletion({from:creator});
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6);
	});

	global.it('T0.6. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1);
		let th = await task.flush();
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);
	});

});


global.contract('1.Tasks: postpaid positive scenario with UNKNOWN price. Task created by creator', (accounts) => {
	let task;
	let mcStorage;
	let mcInstance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETHdiv100 = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,{gas: 10000000, from: creator});
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

		let th = await task.evaluateAndSetNeededWei(ETHdiv100, {from:creator});

		let neededWei = await task.neededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be ETHdiv100');

		let isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, true);

		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
	});

	global.it('T1.4. should become "CanGetFunds" after creator calls processFunds()',async() => {

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETHdiv100);

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETHdiv100, {value:ETHdiv100});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETHdiv100);

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

	const ETHdiv100 = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,{gas: 10000000, from: creator});
	});

	global.it('T2.1. should create weiTask',async() => {
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			ETHdiv100,
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
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be ETHdiv100');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
	});

	global.it('T2.4. should become "CanGetFunds" after creator calls processFunds()',async() => {

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETHdiv100);

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETHdiv100, {value:ETHdiv100});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETHdiv100);

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

	const ETHdiv100 = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,{gas: 10000000, from: creator});
	});

	global.it('T2.1. should create weiTask',async() => {
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			ETHdiv100,
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
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be ETHdiv100');

		let isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
	});

	global.it('T2.4. should become "CanGetFunds" after creator calls processFunds()',async() => {

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		let minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETHdiv100);

		let isMoneyReceived = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived, false);

		let th = await task.processFunds(ETHdiv100, {value:ETHdiv100});

		let isMoneyReceived2 = await task.isMoneyReceived();
		global.assert.strictEqual(isMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETHdiv100);

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

	const ETHdiv100 = 10000000000000000;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000, from: creator});
		mcInstance = await Microcompany.new(mcStorage.address,{gas: 10000000, from: creator});
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
		global.assert.strictEqual(neededWei.toNumber(),0,'Should be ETHdiv100');

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

		let th = await task.processFunds(ETHdiv100, {value:ETHdiv100});

		let isMoneyReceived2 = await task.isMoneyReceived();
		// global.assert.strictEqual(isMoneyReceived2, true);

		let isNeedsMoneyAfterSend = await task.isNeedsMoney();
		// global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		let minWeiNeeded2 = await task.getMinWeiNeeded();
		// global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		let balance = await task.getBalance();
		// global.assert.strictEqual(balance.toNumber(), ETHdiv100);

		let status = await task.getCurrentState();
		// global.assert.strictEqual(status.toNumber(), 6)		
	});

	global.it('T3.5. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1);
		let th = await task.flush();
		let status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7)		
	})	
});


global.contract('4.Tasks: cancel on init state.', (accounts) => {});

global.contract('5.Tasks: cancel on prepaid state.', (accounts) => {});

global.contract('6.Tasks: prepaid negative scenarios.', (accounts) => {
	global.it('T6.1. should not create weiTask (prepaid + donation)',async() => {});
	global.it('T6.2. should not create weiTask (prepaid + 0 Wei)',async() => {});
	global.it('T6.3. should not create weiTask (no caption)',async() => {});

	global.it('T6.4. should create weiTask',async() => {});

	global.it('T6.4. should not create weiTask',async() => {});

});

