var increaseTimeTo = require('./utils/increaseTime');
var latestTime = require('./utils/latestTime');
var advanceBlock = require('./utils/advanceToBlock');

var WeiTask = artifacts.require("./WeiTask");
var WeiBounty = artifacts.require("./WeiBounty");
var DaoBase = artifacts.require("./DaoBase");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");

var CheckExceptions = require('./utils/checkexceptions');

function KECCAK256 (x){
	return web3.sha3(x);
}

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

let token;
let daoBase;
let store;

contract('Tasks', (accounts) => {
	var firstContractBalance;
	var firstEmployeeBalance;
	var firstCreatorBalance;

	var secondContractBalance;
	var secondEmployeeBalance;
	var secondCreatorBalance;
	
	let issueTokens;
	let manageGroups;
	let addNewProposal;
	let upgradeDaoContract;

	var timeToCancell = 2;
	var deadlineTime = 5;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const outsider = accounts[2];
	const someAddress = accounts[3];

	const ETH = 1000000000000000000;

	before(async function () {
		await advanceBlock();
	});

	beforeEach(async() => {
		token = await StdDaoToken.new("StdToken","STDT",18, true, true, true, 1000000000);
		await token.mint(creator, 1000);
    
		store = await DaoStorage.new([token.address],{from: creator});
		daoBase = await DaoBase.new(store.address,{from: creator});
		
		issueTokens = await daoBase.ISSUE_TOKENS();
		
		manageGroups = await daoBase.MANAGE_GROUPS();
		
		upgradeDaoContract = await daoBase.UPGRADE_DAO_CONTRACT();

		addNewProposal = await daoBase.ADD_NEW_PROPOSAL();

		// add creator as first employee
		await store.addGroupMember(KECCAK256("Employees"), creator);
		await store.allowActionByAddress(manageGroups,creator);
		

		// do not forget to transfer ownership
		await token.transferOwnership(daoBase.address);
		await store.transferOwnership(daoBase.address);

		await daoBase.allowActionByAnyMemberOfGroup(addNewProposal,"Employees");

		// this is a list of actions that require voting
		await daoBase.allowActionByVoting(manageGroups,token.address);
		await daoBase.allowActionByVoting(issueTokens,token.address);
	});

	it('Tasks: prepaid positive scenario. Task created by creator',async() => {
		// should not create weiTask (prepaid + donation);
		th = await CheckExceptions.checkContractThrows(WeiTask.new, 
			[daoBase.address, 'Task Caption', 'Task description', false, true, ETH, { from: creator }]
		);

		// should not create weiTask (prepaid + 0 Wei);
		th = await CheckExceptions.checkContractThrows(WeiTask.new, 
			[daoBase.address, 'Task Caption', 'Task description', false, false, 0, { from: creator }]
		);

		// should create weiTask
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startTask = await task.START_TASK();

		await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

		// should not become "InProgress" before "Prepaid"
		th = await CheckExceptions.checkContractThrows(task.startTask,
			[employee1, { from: employee1 }]
		);

		// should become "PrePaid" after transfer 1 ETH
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(),0);

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyBeforeSend, true);

		var minWeiNeeded = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		assert.strictEqual(balance.toNumber(), ETH);

		var isPostpaid = await task.isPostpaid();
		assert.strictEqual(isPostpaid, false);

		var status2 = await task.getCurrentState();
		assert.strictEqual(status2.toNumber(), 2);

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1);
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 3);

		// should not become "Completed" after outsider call
		th = await CheckExceptions.checkContractThrows(task.notifyThatCompleted,
			[{ from: outsider }]
		);

		// should become "Completed" after employee have marked task as compvared
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 5);

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isDonation = await task.isDonation();
		assert.strictEqual(isDonation,false);

		//N5. should not become "CanGetFunds" after outsider call
		th = await CheckExceptions.checkContractThrows(task.confirmCompletion,
			[{ from: outsider }]
		);

		// should become "CanGetFunds" after creator have marked task as compvared
		var th = await task.confirmCompletion({from:creator});
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 6);

		//N6. should not become "Finished" after outsider calls
		await CheckExceptions.checkContractThrows(task.setOutput,
			[outsider,{ from: outsider }]
		);

		await CheckExceptions.checkContractThrows(task.setOutput,
			[creator,{ from: outsider }]
		);

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1);
		var th = await task.flush();
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		assert.strictEqual(employeeDelta > 950000000000000000 ,true);
	});

	it('Tasks: postpaid positive scenario with UNKNOWN price. Task created by creator', async() => {
		// should create weiTask
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			0,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startTask = await task.START_TASK();
		await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1, {gasPrice:0});
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 3);

		// should become "CompleteButNeedsEvaluation" after employee have marked task as compvared
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),0,'Should be 0');

		var isDonation = await task.isDonation();
		assert.strictEqual(isDonation,false);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 4);

		// should become "Completed" after creator calls evaluateAndSetNeededWei();
		var th = await task.evaluateAndSetNeededWei(ETH, {from:creator});

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be ETH');

		var isPostpaid = await task.isPostpaid();
		assert.strictEqual(isPostpaid, true);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 5);

		// should become "CanGetFunds" after creator calls processFunds();
		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyBeforeSend, true);

		var minWeiNeeded = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		assert.strictEqual(balance.toNumber(), ETH);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 6)

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1);
		var th = await task.flush();
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		// assert.strictEqual(secondEmployeeBalance.toNumber(),0);
		assert.strictEqual(employeeDelta, ETH);
	});

	it('Tasks: postpaid positive scenario with KNOWN price. Task created by creator',async() => {
		// should create weiTask
		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			true,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startTask = await task.START_TASK();
		await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1, {gasPrice:0});
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 3);

		// should become "Completed" after employee have marked task as completed
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be ETH');

		var isDonation = await task.isDonation();
		assert.strictEqual(isDonation,false);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 5);

		// should become "CanGetFunds" after creator calls processFunds();
		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyBeforeSend, true);

		var minWeiNeeded = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		assert.strictEqual(balance.toNumber(), ETH);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 6);

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1, {gasPrice:0});
		var th = await task.flush();
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		// assert.strictEqual(secondEmployeeBalance.toNumber(),0);
		assert.strictEqual(employeeDelta, ETH);
	});

	it('Tasks: donation positive scenario. Task created by creator',async() => {
		// should create weiTask'
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			true,
			true,
			0,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startTask = await task.START_TASK();
		await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

		// should become "InProgress" after employee have started task
		var th = await task.startTask(employee1, {gasPrice:0});
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 3);

		// should become "Completed" after creator calls evaluateAndSetNeededWei();
		var th = await task.notifyThatCompleted({from:employee1, gasPrice:0});

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),0,'Should be ETH');

		var isPostpaid = await task.isPostpaid();
		assert.strictEqual(isPostpaid, true);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 5);

		// should become "CanGetFunds" after creator calls processFunds();
		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyBeforeSend, true);

		var minWeiNeeded = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded.toNumber(),0);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		assert.strictEqual(balance.toNumber(), ETH);

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 6)

		// should become "Finished" after employee set output and call flush();
		var out = await task.setOutput(employee1, {gasPrice:0});
		var th = await task.flush();
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		assert.strictEqual(employeeDelta, ETH);
	});

	it('Tasks: cancel on init state.', async() => {
		// should create weiTask',async() => {
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startTask = await task.START_TASK();
		await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

		await increaseTimeTo(duration.hours(3))
		// should become "Cancelled"
		th = await task.cancell({from:creator});

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 1);
	});

	it('Tasks: cancel on prepaid state.',async() => {

		// should create weiTask
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator)

		task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startTask = await task.START_TASK();
		await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

		// should become "PrePaid" after transfer 1 ETH
		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(),0);

		var neededWei = await task.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyBeforeSend, true);

		var minWeiNeeded = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await task.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await task.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await task.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await task.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await task.getBalance();
		assert.strictEqual(balance.toNumber(), ETH);

		var isPostpaid = await task.isPostpaid();
		assert.strictEqual(isPostpaid, false);

		var status2 = await task.getCurrentState();
		assert.strictEqual(status2.toNumber(), 2);

		await increaseTimeTo(duration.hours(3))
		// should become "Cancelled"
		th = await task.cancell({from:creator});

		var status = await task.getCurrentState();
		assert.strictEqual(status.toNumber(), 1);
	});

	it('Bounty: positive scenario. Bounty created by creator',async() => {
		// should create weiBounty
		firstContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(firstContractBalance.toNumber(),0);

		firstEmployeeBalance = await web3.eth.getBalance(employee1);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		bounty = await WeiBounty.new( // (IDaoBase _dao, string _caption, string _desc, uint _neededWei, uint64 _deadlineTime)
			daoBase.address, 
			'Bounty Caption', 
			'Bounty description',
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

		startBounty = await bounty.START_BOUNTY();
		await daoBase.allowActionByAddress(startBounty,employee1);

		// should not become "InProgress" before "Prepaid"
		th = await CheckExceptions.checkContractThrows(bounty.startTask,
			[{ from: employee1 }]
		);

		// should become "PrePaid" after transfer 1 ETH
		var status = await bounty.getCurrentState();
		assert.strictEqual(status.toNumber(),0);

		var neededWei = await bounty.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isNeedsMoneyBeforeSend = await bounty.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyBeforeSend, true);

		var minWeiNeeded = await bounty.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded.toNumber(),ETH);

		var getIsMoneyReceived = await bounty.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived, false);

		firstCreatorBalance = await web3.eth.getBalance(creator);

		var th = await bounty.processFunds(ETH, {value:ETH});

		secondCreatorBalance = await web3.eth.getBalance(creator);

		var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
		assert.strictEqual(creatorDelta > ETH*0.95 ,true);

		var getIsMoneyReceived2 = await bounty.getIsMoneyReceived();
		assert.strictEqual(getIsMoneyReceived2, true);

		var isNeedsMoneyAfterSend = await bounty.isNeedsMoney();
		assert.strictEqual(isNeedsMoneyAfterSend, false);

		var minWeiNeeded2 = await bounty.getMinWeiNeeded();
		assert.strictEqual(minWeiNeeded2.toNumber(),0);

		var balance = await bounty.getBalance();
		assert.strictEqual(balance.toNumber(), ETH);

		var isPostpaid = await bounty.isPostpaid();
		assert.strictEqual(isPostpaid, false);

		var status2 = await bounty.getCurrentState();
		assert.strictEqual(status2.toNumber(), 2);

		// should become "InProgress" after employee have started bounty
		var th = await bounty.startTask({from:employee1});
		var status = await bounty.getCurrentState();
		assert.strictEqual(status.toNumber(), 3);

		// should not become "Completed" after outsider call
		th = await CheckExceptions.checkContractThrows(bounty.notifyThatCompleted,
			[{ from: outsider }]
		);

		// should become "Completed" after employee have marked bounty as compvared
		var th = await bounty.notifyThatCompleted({from:employee1, gasPrice:0});

		var status = await bounty.getCurrentState();
		assert.strictEqual(status.toNumber(), 5);

		var neededWei = await bounty.getNeededWei();
		assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

		var isDonation = await bounty.isDonation();
		assert.strictEqual(isDonation,false);

		//N5. should not become "CanGetFunds" after outsider call
		th = await CheckExceptions.checkContractThrows(bounty.confirmCompletion,
			[{ from: outsider }]
		);

		// should become "CanGetFunds" after creator have marked bounty as compvared
		var th = await bounty.confirmCompletion({from:creator});
		var status = await bounty.getCurrentState();
		assert.strictEqual(status.toNumber(), 6);

		// should not become "Finished" after outsider calls
		await CheckExceptions.checkContractThrows(bounty.setOutput,
			[outsider,{ from: outsider }]
		);

		await CheckExceptions.checkContractThrows(bounty.setOutput,
			[creator,{ from: outsider }]
		);

		// should become "Finished" after employee set output and call flush();
		var out = await bounty.setOutput(employee1);
		var th = await bounty.flush();
		var status = await bounty.getCurrentState();
		assert.strictEqual(status.toNumber(), 7);

		secondContractBalance = await web3.eth.getBalance(daoBase.address);
		assert.strictEqual(secondContractBalance.toNumber(),0);

		secondEmployeeBalance = await web3.eth.getBalance(employee1);
		var employeeDelta = secondEmployeeBalance.toNumber() - firstEmployeeBalance.toNumber();
		assert.strictEqual(employeeDelta > 950000000000000000 ,true);
	});

	describe('isCanCancell test with cancell() method', function () {

		it('should fail due to _timeToCancell =< 0', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			0,
			{ from: creator }
		).should.be.rejectedWith('revert');
		});
			
		it('should fail due to not time to cancell yet', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);
			await task.cancell({from: creator}).should.be.rejectedWith('revert');
			var status = await task.getCurrentState();
			assert.notEqual(status.toNumber(), 1); //must not be cancelled
		});
			
		it('should pass', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);
			await increaseTimeTo(duration.hours(3));
			await task.cancell({from: creator}).should.be.fulfilled;
			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(), 1); // should be cancelled
		});
		});

	describe('test returnMoney after deadline missed', function () {

		it('should fail due to deadlineTime =< 0', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			0,
			timeToCancell,
			{ from: creator }
		).should.be.rejectedWith('revert');
		});
			
		it('should fail due to not deadline missed yet', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);
			startTask = await task.START_TASK();
			await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(),0);

			var neededWei = await task.getNeededWei();
			assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

			var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
			assert.strictEqual(isNeedsMoneyBeforeSend, true);

			var minWeiNeeded = await task.getMinWeiNeeded();
			assert.strictEqual(minWeiNeeded.toNumber(),ETH);

			var getIsMoneyReceived = await task.getIsMoneyReceived();
			assert.strictEqual(getIsMoneyReceived, false);

			firstCreatorBalance = await web3.eth.getBalance(creator);

			var th = await task.processFunds(ETH, {value:ETH});

			secondCreatorBalance = await web3.eth.getBalance(creator);

			var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
			assert.strictEqual(creatorDelta > ETH*0.95 ,true);

			await task.startTask(employee1);
			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(), 3); //should be in progress

			await task.returnMoney({from: creator}).should.be.rejectedWith('revert');

		});


		it('should fail due to state != InProgress yet', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);

			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(),0);

			var neededWei = await task.getNeededWei();
			assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

			var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
			assert.strictEqual(isNeedsMoneyBeforeSend, true);

			var minWeiNeeded = await task.getMinWeiNeeded();
			assert.strictEqual(minWeiNeeded.toNumber(),ETH);

			var getIsMoneyReceived = await task.getIsMoneyReceived();
			assert.strictEqual(getIsMoneyReceived, false);

			firstCreatorBalance = await web3.eth.getBalance(creator);

			var th = await task.processFunds(ETH, {value:ETH});

			secondCreatorBalance = await web3.eth.getBalance(creator);

			var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
			assert.strictEqual(creatorDelta > ETH*0.95 ,true);

			assert.notEqual(status.toNumber(), 3); //should be in progress

			await increaseTimeTo(duration.hours(deadlineTime));

			await task.returnMoney({from: creator}).should.be.rejectedWith('revert');

		});

		it('should pass', async function () {
			task = await WeiTask.new( // (address _mc, string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public
			daoBase.address, 
			'Task Caption', 
			'Task description',
			false,
			false,
			ETH,
			deadlineTime,
			timeToCancell,
			{ from: creator }
		);
			startTask = await task.START_TASK();
			await daoBase.allowActionByAnyMemberOfGroup(startTask,"Employees");

			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(),0);

			var neededWei = await task.getNeededWei();
			assert.strictEqual(neededWei.toNumber(),ETH,'Should be 1 ETH');

			var isNeedsMoneyBeforeSend = await task.isNeedsMoney();
			assert.strictEqual(isNeedsMoneyBeforeSend, true);

			var minWeiNeeded = await task.getMinWeiNeeded();
			assert.strictEqual(minWeiNeeded.toNumber(),ETH);

			var getIsMoneyReceived = await task.getIsMoneyReceived();
			assert.strictEqual(getIsMoneyReceived, false);

			firstCreatorBalance = await web3.eth.getBalance(creator);

			var th = await task.processFunds(ETH, {value:ETH});

			secondCreatorBalance = await web3.eth.getBalance(creator);

			var creatorDelta = firstCreatorBalance.toNumber() - secondCreatorBalance.toNumber();
			assert.strictEqual(creatorDelta > ETH*0.95 ,true);

			await task.startTask(employee1);
			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(), 3); //should be in progress

			await increaseTimeTo(duration.hours(deadlineTime));

			firstCreatorBalance = await web3.eth.getBalance(creator);
			await task.returnMoney({from: creator});
			secondCreatorBalance = await web3.eth.getBalance(creator);
			creatorDelta = secondCreatorBalance.toNumber() - firstCreatorBalance.toNumber();
			assert.strictEqual(creatorDelta > ETH*0.9 ,true);

			var status = await task.getCurrentState();
			assert.strictEqual(status.toNumber(), 8); //must be DeadlineMissed
		});
		});

});
