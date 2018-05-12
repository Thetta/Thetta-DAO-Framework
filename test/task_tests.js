var WeiTask = artifacts.require("./WeiTask");
var WeiBounty = artifacts.require("./WeiBounty");
var Microcompany = artifacts.require("./Microcompany");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

var AutoActionCaller = artifacts.require("./AutoActionCaller");
var CheckExceptions = require('./utils/checkexceptions');

global.contract('Tasks', (accounts) => {
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
		const mcStorageAddress = mcStorage.address;
		
		mcInstance = await Microcompany.new(mcStorageAddress,{gas: 10000000, from: creator});
	});

	global.it('T0.1. should create weiTask',async() => {
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			mcInstance.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETHdiv100, // 1 Eth
			{gas: 10000000, from: creator}
		);
	});


	global.it('T0.2. should become "PrePaid" after transfer 1 ETHdiv100',async() => {
		let status = await task.getCurrentState()
		global.assert.strictEqual(status.toNumber(),0);
		console.log('status:', status.toNumber(), 'Should be 0 status (init)')
		
		let neededWei = await task.neededWei()
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be 1 ETHdiv100');
		console.log('neededWei:', neededWei.toNumber(),'Should be 1 ETHdiv100');

		let isNeedsMoneyBeforeSend = await task.isNeedsMoney()
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
		console.log('isNeedsMoneyBeforeSend:', isNeedsMoneyBeforeSend, 'Should need money before send')
	
		let minWeiNeeded = await task.getMinWeiNeeded()
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETHdiv100);
		console.log('minWeiNeeded:', minWeiNeeded.toNumber(), 'Should be 1 ETHdiv100')

		let isMoneyReceived = await task.isMoneyReceived()
		global.assert.strictEqual(isMoneyReceived, false);
		console.log('isMoneyReceived:', isMoneyReceived, 'Should be false')

		let th = await task.processFunds(ETHdiv100, {value:ETHdiv100})

		let isMoneyReceived2 = await task.isMoneyReceived()
		global.assert.strictEqual(isMoneyReceived2, true);
		console.log('isMoneyReceived:', isMoneyReceived2, 'Should be true')

		let isNeedsMoneyAfterSend = await task.isNeedsMoney()
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);
		console.log('isNeedsMoneyAfterSend:', isNeedsMoneyAfterSend, 'Should NOT need money before send')

		let minWeiNeeded2 = await task.getMinWeiNeeded()
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);
		console.log('minWeiNeeded:', minWeiNeeded2.toNumber(), 'Should be 0 ETHdiv100')

		let balance = await task.getBalance()
		global.assert.strictEqual(balance.toNumber(), ETHdiv100)
		console.log('balance:', balance.toNumber(), 'should be 1 ETHdiv100')
		
		let isPostpaid = await task.isPostpaid()
		global.assert.strictEqual(isPostpaid, false)
		console.log('isPostpaid:', isPostpaid, 'should be false')

		let status2 = await task.getCurrentState()
		global.assert.strictEqual(status2.toNumber(), 2)
		console.log('status:', status2.toNumber())
	});

	global.it('T0.3. should become "InProgress" after employee have started task',async() => {
		let th = await task.startTask(employee1);
		let status = await task.getCurrentState()
		console.log('status:', status.toNumber())
		global.assert.strictEqual(status.toNumber(), 3)
	})

	global.it('T0.4. should become "Completed" after employee have marked task as completed',async() => {
		let th = await task.notifyThatCompleted({from:employee1});
		
		let status = await task.getCurrentState()
		console.log('status:', status.toNumber())
		global.assert.strictEqual(status.toNumber(), 5)
		
		let neededWei = await task.neededWei()
		global.assert.strictEqual(neededWei.toNumber(),ETHdiv100,'Should be 1 ETHdiv100');
		console.log('neededWei:', neededWei.toNumber(),'Should be 1 ETHdiv100');

		let isDonation = await task.isDonation()
		global.assert.strictEqual(isDonation,false);
		console.log('isDonation:', isDonation,'Should be false');
	})

	global.it('T0.5. should become "CanGetFunds" after creator have marked task as completed',async() => {
		let th = await task.confirmCompletion({from:creator});
		let status = await task.getCurrentState()
		console.log('status:', status.toNumber())
		global.assert.strictEqual(status.toNumber(), 6)
	})

	global.it('T0.6. should become "Finished" after employee set output and call flush() ',async() => {
		let out = await task.setOutput(employee1)
		let th = await task.flush();
		let status = await task.getCurrentState()
		console.log('status:', status.toNumber())
		global.assert.strictEqual(status.toNumber(), 7)		
	})

});

