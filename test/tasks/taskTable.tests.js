require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var increaseTimeTo = require('../utils/increaseTime');
var latestTime = require('../utils/latestTime');
var advanceBlock = require('../utils/advanceToBlock');

var TaskTable = artifacts.require('./TaskTable');
var DaoBase = artifacts.require('./DaoBase');
var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');

const BigNumber = web3.BigNumber;

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
let daoBase;
let store;

contract('TaskTable', (accounts) => {
  var firstContractBalance;
  var firstEmployeeBalance;
  var firstCreatorBalance;

  var secondContractBalance;
  var secondEmployeeBalance;
  var secondCreatorBalance;

  let startTask;
  let startBounty;
  let manageGroups;
  let taskTable;

  var timeToCancell = 2;
  var deadlineTime = 5;

  const creator = accounts[0];
  const employee = accounts[1];
  const outsider = accounts[2];
  const someAddress = accounts[3];

  const ETH = 1000000000000000000;

  const neededWei = 1000000;

  before(async function () {
    await advanceBlock();
  });

  beforeEach(async () => {
    token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
    await token.mintFor(creator, 1000);

    store = await DaoStorage.new([token.address], { from: creator });
    daoBase = await DaoBase.new(store.address, { from: creator });

    taskTable = await TaskTable.new(daoBase.address);

    manageGroups = await daoBase.MANAGE_GROUPS();
    startTask = await taskTable.START_TASK();
    startBounty = await taskTable.START_BOUNTY();

    // add creator as first employee
    await store.addGroupMember(KECCAK256('Employees'), creator);
    await store.allowActionByAddress(manageGroups, creator);

    // do not forget to transfer ownership
    await token.transferOwnership(daoBase.address);
    await store.transferOwnership(daoBase.address);
  });

  describe('addNewTask', () => {
    it('should success add new task', async () => {
      await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
    });
  });

  describe('addNewBounty', () => {
    it('should success add new bounty', async () => {
      await taskTable.addNewBounty("Test", "Task for tests", neededWei, 1, 1);
    });
  });

  describe('startTask', () => {
    it('should revert due to dont have permissions', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startTask(id, employee).should.be.rejectedWith('revert');
    });

    it('should successfully start task', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
    });
  });
  
  describe('startBounty', () => {
    it('should revert due to dont have permissions', async () => {
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startBounty(id, {from: employee}).should.be.rejectedWith('revert');
    });

    it('should successfully start bounty', async () => {
      let tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await daoBase.allowActionByAddress(startBounty, employee);
      await taskTable.startBounty(id, {from: employee});
    });
  });

  describe('setEmployee', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setEmployee(id, employee, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should successfully set employee', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
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
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setOutput(id, employee, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should successfully set output', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
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
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 10000});
      assert.equal(await taskTable.getBalance(id), 10000);
    });
  });

  describe('getCaption', () => {
    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getCaption(id), "Test");
    });
  });

  describe('getDescription', () => {
    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      assert.equal(await taskTable.getDescription(id), "Task for tests");
    });
  });

  describe('getCurrentState', () => {
    it('should return State PrePaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      assert.equal(await taskTable.getCurrentState(id), 2);
    });

    it('should return State CanGetFunds', async () => {
      console.log("Step 1");
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;

      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.confirmCompletion(id);
      assert.equal(await taskTable.getCurrentState(id), 7);
    });

    it('should return correct value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      assert.equal(await taskTable.getCurrentState(id), 6);
    });
  });

  describe('cancell', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.cancell(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to time to cancell missed', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await increaseTimeTo(duration.weeks(10));
      await taskTable.cancell(id).should.be.rejectedWith('revert');
    });

    it('should successfully cancell task', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.cancell(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 1);
    });
  });

  describe('returnMoney', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await increaseTimeTo(duration.weeks(1));
      await taskTable.returnMoney(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to deadLine has not missed yet', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.returnMoney(id).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in progress', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await taskTable.returnMoney(id).should.be.rejectedWith('revert');
    });

    it('should successfully return money', async () => {
      console.log("Step 1");
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await increaseTimeTo(duration.weeks(1));
      await taskTable.returnMoney(id);
    });
  });

  describe('notifyThatCompleted', () => {
    it('should revert due to call not by money source or employee', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in progress', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.notifyThatCompleted(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should successfully change state to complete', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      tx = await taskTable.notifyThatCompleted(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 6);
    });

    it('should successfully change state to complete but needs evaluation', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      tx = await taskTable.notifyThatCompleted(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 5);
    });
  });

  describe('evaluateAndSetNeededWei', () => {
    it('should revert due to call not by money source', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in CompleteButNeedsEvaluation', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.evaluateAndSetNeededWei(id, neededWei).should.be.rejectedWith('revert');
    });

    it('should revert due to needed value != 0', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei).should.be.rejectedWith('revert');
    });

    it('should successfully change state to complete and set needed value', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
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
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei);
      await taskTable.confirmCompletion(id, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('should revert due to task postpaid', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, neededWei);
      await taskTable.confirmCompletion(id).should.be.rejectedWith('revert');
    });

    it('should revert due to state not in Complete', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.confirmCompletion(id).should.be.rejectedWith('revert');
    });

    it('should revert due to needed value = 0', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, 0, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.evaluateAndSetNeededWei(id, 0);
      await taskTable.confirmCompletion(id).should.be.rejectedWith('revert');
    });

    it('should successfully change state to CanGetFunds', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
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
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.flush(id).should.be.rejectedWith('revert');
    });

    it('should revert due to output account not seted', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.confirmCompletion(id);
      await taskTable.flush(id).should.be.rejectedWith('revert');
    });

    it('should successfully send funds to output account and change state to Finished', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setOutput(id, outsider);
      let balanceBefore = await web3.eth.getBalance(outsider);
      await taskTable.processFunds(id, {value: 1000000});
      await daoBase.allowActionByAddress(startTask, creator);
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
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.processFunds(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_ProcessFunds');
    });
  });

});
