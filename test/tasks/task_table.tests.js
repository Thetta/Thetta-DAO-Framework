const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var increaseTimeTo = require('../utils/increaseTime');
var latestTime = require('../utils/latestTime');
var advanceBlock = require('../utils/advanceToBlock');

var TaskTable = artifacts.require('./TaskTable');
var DaoBaseMock = artifacts.require('./DaoBaseMock');
var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');

function KECCAK256 (x) {
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
let daoBaseMock;
let store;

contract('TaskTable', (accounts) => {
  let startTask;
  let startBounty;
  let manageGroups;
  let taskTable;

  var timeToCancel = 1;
  var deadlineTime = 1;

  const creator = accounts[0];
  const employee = accounts[1];
  const outsider = accounts[2];

  const neededWei = 1000000;

  before(async function () {
    await advanceBlock();
  });

  beforeEach(async () => {
    token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
    await token.mintFor(creator, 1000);

    // store = await DaoStorage.new([token.address], { from: creator });
    daoBaseMock = await DaoBaseMock.new([token.address], { from: creator });

    taskTable = await TaskTable.new(daoBaseMock.address);
  });

  describe('addNewTask', () => {
    it('should success add new task and generate id', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(id, 0);
    });

    it('should be state Init', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getCurrentState(id), 0);
    });

    it('should increase elementsCount', async () => {
      assert.equal(await taskTable.elementsCount(), 0);
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.elementsCount(), 1);
    });
  });

  describe('addNewBounty', () => {
    it('should success add new bounty and generate id', async () => {
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(id, 0);
    });

    it('should be state PrePaid', async () => {
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getCurrentState(id), 2);
    });

    it('should increase elementsCount', async () => {
      assert.equal(await taskTable.elementsCount(), 0);
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.elementsCount(), 1);
    });
  });

  describe('startTask', () => {
    it('should revert due to task in Init state and not PostPaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startTask(id, employee).should.be.rejectedWith('revert');
    });

    it('should revert due to task not in Init or PrePaid state', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startTask(id, employee);
      await taskTable.startTask(id, employee).should.be.rejectedWith('revert');
    });

    it('should successfully start task and change state to inProgress', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.startTask(id, employee);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 4);
    });
  });
  
  describe('startBounty', () => {
    it('should revert due to bounty in PrePaid state', async () => {
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startBounty(id, {from: employee});
      await taskTable.startBounty(id, {from: employee}).should.be.rejectedWith('revert');
    });

    it('should successfully start bounty', async () => {
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.startBounty(id, {from: employee});
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 4);
    });
  });

  describe('setEmployee', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setEmployee(id, employee, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should successfully set employee', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.setEmployee(id, employee);
      events = tx.logs.filter(l => l.event === 'TaskTable_SetEmployee');
      let result = events[0].args._employee;
      await assert.equal(employee, result);
    });
  });
  
  describe('setOutput', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setOutput(id, employee, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should successfully set output', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.setOutput(id, employee);
      events = tx.logs.filter(l => l.event === 'TaskTable_SetOutput');
      let result = events[0].args._output;
      await assert.equal(employee, result);
    });
  });

  describe('getBalance', () => {
    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getBalance(id), 0);
    });
  });

  describe('getCaption', () => {
    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getCaption(id), "Test");
    });
  });

  describe('getDescription', () => {
    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getDescription(id), "Task for tests");
    });
  });

  describe('getCurrentState', () => {
    it('should return State PrePaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      assert.equal(await taskTable.getCurrentState(id), 2);
    });

    it('should return State CanGetFunds', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;

      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.confirmCompletion(id);
      assert.equal(await taskTable.getCurrentState(id), 7);
    });

    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      assert.equal(await taskTable.getCurrentState(id), 6);
    });
  });

  describe('cancel', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.cancel(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to not Init or PrePaid state', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startTask(id, employee);
      await taskTable.cancel(id).should.be.rejectedWith('revert');
    });

    it('should revert due to time to cancel missed', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await increaseTimeTo(duration.weeks(10));
      await taskTable.cancel(id).should.be.rejectedWith('revert');
    });

    it('should successfully cancel bounty and return money when PrePaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, 1e18, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1e18});
      let balanceBefore = await web3.eth.getBalance(creator);
      tx = await taskTable.cancel(id);
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal((balanceAfter - balanceBefore) > 0, true);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 1);
    });

    it('should successfully cancel task and not return money when not PrePaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      let balanceBefore = await web3.eth.getBalance(creator);
      tx = await taskTable.cancel(id, {gasPrice: 0});
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal(balanceAfter - balanceBefore, 0);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 1);
    });
  });

  describe('returnMoney', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: neededWei});
      await taskTable.startTask(id, employee);
      await increaseTimeTo(duration.weeks(1));
      await taskTable.returnMoney(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to deadLine has not missed yet', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: neededWei});
      await taskTable.startTask(id, employee);
      await taskTable.returnMoney(id).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in progress', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: neededWei});
      await taskTable.returnMoney(id).should.be.rejectedWith('revert');
    });

    it('should successfully return money and change status to DeadlineMissed when funds < contract.balance', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startTask(id, employee);
      await increaseTimeTo(duration.weeks(1));
      let balanceBefore = await web3.eth.getBalance(creator);
      tx = await taskTable.returnMoney(id, {gasPrice: 0});
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal(balanceAfter - balanceBefore, 0);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 9);
    });

    it('should successfully return money and change status to DeadlineMissed', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, 1e18, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1e18});
      await taskTable.startTask(id, employee);
      await increaseTimeTo(duration.weeks(1));
      let balanceBefore = await web3.eth.getBalance(creator);
      tx = await taskTable.returnMoney(id);
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal((balanceAfter - balanceBefore) > 0, true);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 9);
    });
  });

  describe('notifyThatCompleted', () => {
    it('should revert due to call not by money source or employee', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in progress', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.notifyThatCompleted(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should successfully change state to complete', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      tx = await taskTable.notifyThatCompleted(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 6);
    });

    it('should successfully change state to complete but needs evaluation', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      tx = await taskTable.notifyThatCompleted(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 5);
    });
  });

  describe('evaluateAndSetNeededWei', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in CompleteButNeedsEvaluation', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.evaluateAndSetNeededWei(id, neededWei).should.be.rejectedWith('revert');
    });

    it('should revert due to needed value != 0', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei).should.be.rejectedWith('revert');
    });

    it('should successfully change state to complete and set needed value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      tx = await taskTable.evaluateAndSetNeededWei(id, neededWei);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 6);
    });
  });

  describe('confirmCompletion', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei);
      await taskTable.confirmCompletion(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to task postpaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei);
      await taskTable.confirmCompletion(id).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in Complete', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.confirmCompletion(id).should.be.rejectedWith('revert');
    });

    it('should revert due to needed value = 0', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, 0);
      await taskTable.confirmCompletion(id).should.be.rejectedWith('revert');
    });

    it('should successfully change state to CanGetFunds', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      tx = await taskTable.confirmCompletion(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 7);
    });
  });

  describe('flush', () => {
    it('should revert due to state not in CanGetFunds', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.flush(id).should.be.rejectedWith('revert');
    });

    it('should revert due to output account not seted', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.confirmCompletion(id);
      await taskTable.flush(id).should.be.rejectedWith('revert');
    });

    it('should successfully send funds to output account and change state to Finished', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setOutput(id, outsider);
      let balanceBefore = await web3.eth.getBalance(outsider);
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.confirmCompletion(id);
      tx = await taskTable.flush(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 8);
      let balanceAfter = await web3.eth.getBalance(outsider);
      assert.equal((balanceAfter - balanceBefore) > 0, true);
    });
  });

  describe('processFunds', () => {
    it('should successfully process funds', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, deadlineTime, timeToCancel);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.processFunds(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_ProcessFunds');
    });
  });

});
