var WeiTask = artifacts.require("./WeiTask");
var WeiBounty = artifacts.require("./WeiBounty");
var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

let token;
let daoBase;
let store;

global.contract('Tasks', (accounts) => {
	var firstContractBalance;
	var firstEmployeeBalance;
	var firstCreatorBalance;

	var secondContractBalance;
	var secondEmployeeBalance;
	var secondCreatorBalance;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 1000000000000000000;

	global.beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		store = await DaoStorage.new([token.address],{gas: 10000000, from: creator});
		daoBase = await DaoBase.new(store.address,{gas: 10000000, from: creator});

		// add creator as first employee	
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(KECCAK256("manageGroups"),creator);

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		await daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Employees");
		await daoBase.allowActionByAnyMemberOfGroup("startTask","Employees");

		await daoBase.allowActionByAddress("startBounty",employee1);

		// this is a list of actions that require voting
		await daoBase.allowActionByVoting("manageGroups",token.address);
		await daoBase.allowActionByVoting("addNewTask",token.address);
		await daoBase.allowActionByVoting("issueTokens",token.address);		
	});

	global.it('Tasks: prepaid positive scenario. Task created by creator',async() => {
		// should not create weiTask (prepaid + donation);
		th = await CheckExceptions.checkContractThrows(WeiTask.new, 
			[daoBase.address, 'Task Caption', 'Task description', false, true, ETH, {gas: 10000000, from: creator}]
		);

		// should not create weiTask (prepaid + 0 Wei);
		th = await CheckExceptions.checkContractThrows(WeiTask.new, 
			[daoBase.address, 'Task Caption', 'Task description', false, false, 0, {gas: 10000000, from: creator}]
		);

		// should create weiTask
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			0,
			{gas: 10000000, from: creator}
		);

		// should not become "InProgress" before "Prepaid"
		th = await CheckExceptions.checkContractThrows(task.startTask,
			[employee1, {gas: 10000000, from: employee1}]
		);

		// should become "PrePaid" after transfer 1 ETH
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(),0);
		
		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		var minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);
		
		var isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, false);

		var status2 = await task.getCurrentState();
		global.assert.strictEqual(status2.toNumber(), 2);

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1);
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);

		// should not become "Completed" after outsider call
		th = await CheckExceptions.checkContractThrows(task.notifyThatCompleted,
			[{gas: 10000000, from: outsider}]
		);

		// should become "Completed" after employee have marked task as compvared
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});
		
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
		
		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);

		//N5. should not become "CanGetFunds" after outsider call
		th = await CheckExceptions.checkContractThrows(task.confirmCompletion,
			[{gas: 10000000, from: outsider}]
		);

		// should become "CanGetFunds" after creator have marked task as compvared
		var th = await task.confirmCompletion({from:creator});
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6);

		//N6. should not become "Finished" after outsider calls
		await CheckExceptions.checkContractThrows(task.setOutput,
			[outsider,{gas: 10000000, from: outsider}]
		);

		await CheckExceptions.checkContractThrows(task.setOutput,
			[creator,{gas: 10000000, from: outsider}]
		);

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1);
		var th = await task.flush();
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		global.assert.strictEqual(employeeDelta > 950000000000000000 ,true);
	});

	global.it('Tasks: postpaid positive scenario with UNKNOWN price. Task created by creator', async() => {
		// should create weiTask
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);
		
		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			0,
			0,
			{gas: 10000000, from: creator}
		);

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1, {gasPrice:0});
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);

		// should become "CompleteButNeedsEvaluation" after employee have marked task as compvared
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),0,'Should be 0');

		var isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 4);

		// should become "Completed" after creator calls evaluateAndSetNeededWei();
		var th = await task.evaluateAndSetNeededWei(ETH, {from:creator});

		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be ETH');

		var isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, true);

		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);

		// should become "CanGetFunds" after creator calls processFunds();
		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		var minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);

		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6)		

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1);
		var th = await task.flush();
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		// global.assert.strictEqual(secondEmployeeBalance.toNumber(),0);
		global.assert.strictEqual(employeeDelta, ETH);
	});

	global.it('Tasks: postpaid positive scenario with KNOWN price. Task created by creator',async() => {
		// should create weiTask
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			ETH,
			0,
			{gas: 10000000, from: creator}
		);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1, {gasPrice:0});
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);

		// should become "Completed" after employee have marked task as completed
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be ETH');

		var isDonation = await task.isDonation();
		global.assert.strictEqual(isDonation,false);
		
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);

		// should become "CanGetFunds" after creator calls processFunds();
		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		var minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);

		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6);

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1, {gasPrice:0});
		var th = await task.flush();
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		// global.assert.strictEqual(secondEmployeeBalance.toNumber(),0);
		global.assert.strictEqual(employeeDelta, ETH);
	});

	global.it('Tasks: donation positive scenario. Task created by creator',async() => {
		// should create weiTask'
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			true,
			true,
			0,
			0,
			{gas: 10000000, from: creator}
		);

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1, {gasPrice:0});
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);
		
		// should become "Completed" after creator calls evaluateAndSetNeededWei();
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),0,'Should be ETH');

		var isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, true);

		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
		
		// should become "CanGetFunds" after creator calls processFunds();
		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		var minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),0);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);

		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6)		

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1, {gasPrice:0});
		var th = await task.flush();
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);
		
		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		global.assert.strictEqual(employeeDelta, ETH);
	});

	global.it('Tasks: cancel on init state.', async() => {
		// should create weiTask',async() => {
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			0,
			{gas: 10000000, from: creator}
		);

		// should become "Cancelled"
		th = await task.cancell({from:creator});
		
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 1);
	});

	global.it('Tasks: cancel on prepaid state.',async() => {

		// should create weiTask
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator)		

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			0,
			{gas: 10000000, from: creator}
		);

		// should become "PrePaid" after transfer 1 ETH
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(),0);
		
		var neededWei = await task.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		var minWeiNeeded = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);
		
		var isPostpaid = await task.isPostpaid();
		global.assert.strictEqual(isPostpaid, false);

		var status2 = await task.getCurrentState();
		global.assert.strictEqual(status2.toNumber(), 2);

		// should become "Cancelled"
		th = await task.cancell({from:creator});
		
		var status = await task.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 1);
	});

	global.it('Bounty: positive scenario. Bounty created by creator',async() => {
		// should create weiBounty
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		bounty = await WeiBounty.new( // (IDaoBase _dao, string _caption, string _desc, uint _neededWei, uint64 _deadlineTime)
			daoBase.address, 
			'Bounty Caption', 
			'Bounty description',
			ETH,
			0,
			{gas: 10000000, from: creator}
		);

		// should not become "InProgress" before "Prepaid"
		th = await CheckExceptions.checkContractThrows(bounty.startTask,
			[{gas: 10000000, from: employee1}]
		);

		// should become "PrePaid" after transfer 1 ETH
		var status = await bounty.getCurrentState();
		global.assert.strictEqual(status.toNumber(),0);
		
		var neededWei = await bounty.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isNeedsMoneyBeforeSend = await bounty.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyBeforeSend, true);
	
		var minWeiNeeded = await bounty.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await bounty.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await bounty.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		global.assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await bounty.getIsMoneyReceived();
		global.assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await bounty.isNeedsMoney();
		global.assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await bounty.getMinWeiNeeded();
		global.assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await bounty.getBalance();
		global.assert.strictEqual(balance.toNumber(), ETH);
		
		var isPostpaid = await bounty.isPostpaid();
		global.assert.strictEqual(isPostpaid, false);

		var status2 = await bounty.getCurrentState();
		global.assert.strictEqual(status2.toNumber(), 2);

		// should become "InProgress" after employee have started bounty
		var th = await bounty.startTask({from:employee1});
		var status = await bounty.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 3);

		// should not become "Completed" after outsider call
		th = await CheckExceptions.checkContractThrows(bounty.notifyThatCompleted,
			[{gas: 10000000, from: outsider}]
		);

		// should become "Completed" after employee have marked bounty as compvared
		var th = await bounty.notifyThatCompleted({from:employee1, gasPrice:0});
		
		var status = await bounty.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 5);
		
		var neededWei = await bounty.getNeededWei();
		global.assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isDonation = await bounty.isDonation();
		global.assert.strictEqual(isDonation,false);

		//N5. should not become "CanGetFunds" after outsider call
		th = await CheckExceptions.checkContractThrows(bounty.confirmCompletion,
			[{gas: 10000000, from: outsider}]
		);

		// should become "CanGetFunds" after creator have marked bounty as compvared
		var th = await bounty.confirmCompletion({from:creator});
		var status = await bounty.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 6);

		// should not become "Finished" after outsider calls
		await CheckExceptions.checkContractThrows(bounty.setOutput,
			[outsider,{gas: 10000000, from: outsider}]
		);

		await CheckExceptions.checkContractThrows(bounty.setOutput,
			[creator,{gas: 10000000, from: outsider}]
		);

		// should become "Finished" after employee set output and call flush();
		var out = await bounty.setOutput(employee1);
		var th = await bounty.flush();
		var status = await bounty.getCurrentState();
		global.assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		global.assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		global.assert.strictEqual(employeeDelta > 950000000000000000 ,true);
	});	
});
