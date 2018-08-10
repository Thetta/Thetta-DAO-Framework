const BigNumber = web3.BigNumber;

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

  const neededWei = 1000000;

  before(async function () {
    await advanceBlock();
  });

  beforeEach(async () => {
    token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
    await token.mintFor(creator, 1000);

    // store = await DaoStorage.new([token.address], { from: creator });
    daoBase = await DaoBase.new([token.address], { from: creator });

    taskTable = await TaskTable.new(daoBase.address);

    manageGroups = await daoBase.MANAGE_GROUPS();
    startTask = await taskTable.START_TASK();
    startBounty = await taskTable.START_BOUNTY();

    // add creator as first employee
    await daoBase.addGroupMember('Employees', creator);
    await daoBase.allowActionByAddress(manageGroups, creator);

    // do not forget to transfer ownership
    await token.transferOwnership(daoBase.address);
    // await store.transferOwnership(daoBase.address);
    await daoBase.easyEditOff();
  });

  it('Should throw revert when user doesnt have permissions to start task or bounty', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.startTask(id, employee).should.be.rejectedWith('revert');
      tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, 1, 1);
      events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      id = events[0].args._eId;
      await taskTable.startBounty(id).should.be.rejectedWith('revert');
  });

  it('Should start task or bounty by user with permissions', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      tx = await taskTable.addNewBounty("Test", "Task for tests", neededWei, 1, 1);
      events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      id = events[0].args._eId;
      await daoBase.allowActionByAddress(startBounty, employee);
      await taskTable.startBounty(id, {from: employee});
  });

  it('Someone (not money source) trying to cancel task before starting - should be revert', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.cancel(id, {from: employee}).should.be.rejectedWith('revert');
  });

  it('Client (money source) cancel task before startin now > creationTime + timeToCancell - should be revert', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await increaseTimeTo(duration.hours(2));
      tx = await taskTable.cancel(id).should.be.rejectedWith('revert');
  });

  it('Client (money source) cancel task before startin now < creationTime + timeToCancell', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", true, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      tx = await taskTable.cancel(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 1);
  });

  it('Someone (not money source) trying to return money from task after deadLine missed', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, 1e18, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1e18, gasPrice: 0});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee, {gasPrice: 0});
      await increaseTimeTo(duration.weeks(1));
      let balanceBefore = await web3.eth.getBalance(creator);
      await taskTable.returnMoney(id, {from: employee, gasPrice: 0}).should.be.rejectedWith('revert');
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal(balanceAfter - balanceBefore, 0);
  });

  it('Client (money source) return money from task when deadLine not missed yet', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, 1e18, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1e18, gasPrice: 0});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee, {gasPrice: 0});
      let balanceBefore = await web3.eth.getBalance(creator);
      await taskTable.returnMoney(id, {gasPrice: 0}).should.be.rejectedWith('revert');
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal(balanceAfter - balanceBefore, 0);
  });

  it('Client (money source) return money from task after deadLine missed', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, 1e18, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.processFunds(id, {value: 1e18, gasPrice: 0});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee, {gasPrice: 0});
      await increaseTimeTo(duration.weeks(1));
      let balanceBefore = await web3.eth.getBalance(creator);
      await taskTable.returnMoney(id, {gasPrice: 0});
      let balanceAfter = await web3.eth.getBalance(creator);
      assert.equal(balanceAfter - balanceBefore, 1e18);
  });

  it('Client (money source) make evaluation for task', async () => {
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

  it('should create, start and complete task (full flow)', async () => {
      let tx = await taskTable.addNewTask("Test", "Task for tests", false, false, neededWei, 1, 1);
      let events = tx.logs.filter(l => l.event === 'TaskTable_ElementAdded');
      let id = events[0].args._eId;
      await taskTable.setOutput(id, outsider);
      let balanceBefore = await web3.eth.getBalance(outsider);
      await taskTable.processFunds(id, {value: neededWei});
      await daoBase.allowActionByAddress(startTask, creator);
      await taskTable.startTask(id, employee);
      await taskTable.notifyThatCompleted(id);
      await taskTable.confirmCompletion(id);
      tx = await taskTable.flush(id);
      events = tx.logs.filter(l => l.event === 'TaskTable_StateChanged');
      let result = events[0].args._state;
      assert.equal(result, 8);
      let balanceAfter = await web3.eth.getBalance(outsider);
      assert.equal((balanceAfter - balanceBefore) >= neededWei, true);
    });
});
