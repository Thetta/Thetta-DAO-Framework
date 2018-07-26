var ether = require('../utils/ether');
var increaseTimeTo = require('../utils/increaseTime');
var latestTime = require('../utils/latestTime');

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

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('SimpleICO');
const StdDaoToken = artifacts.require('StdDaoToken');
const DaoBaseWithUnpackers = artifacts.require("DaoBaseWithUnpackers");
const DaoStorage = artifacts.require("DaoStorage");
const IDaoBase = artifacts.require("IDaoBase");

contract('SimpleICO', function (accounts) {
  const creator = accounts[0];
  const employee1 = accounts[1];
  const employee2 = accounts[2];
  const employee3 = accounts[3];
  const employee4 = accounts[4];

  const rate = 1;
  const softCap = 10000000;
  const hardCap = 100000000000;
  const value = 1000000;
  const minPurchase = 100000;
  const maxPurchase = 1000000000;
  let startDate;
  let endDate;
  let daoBase;

  beforeEach(async function () {
    startDate = latestTime() + duration.weeks(1);
    endDate = startDate + duration.weeks(1);
    token = await StdDaoToken.new("StdToken","STDT",18, true, true, 10e28);
    store = await DaoStorage.new([token.address],{from: creator});
    daoBase = await DaoBaseWithUnpackers.new(store.address,{from: creator});
    issueTokens = await daoBase.ISSUE_TOKENS();
    manageGroups = await daoBase.MANAGE_GROUPS();
    this.crowdsale = await Crowdsale.new(rate, token.address, daoBase.address, minPurchase, maxPurchase, startDate, endDate, softCap, hardCap);
    await store.addGroupMember(KECCAK256("Employees"), this.crowdsale.address);
    await store.allowActionByAddress(issueTokens, this.crowdsale.address);
    await token.transferOwnership(daoBase.address);
  });

  describe('buyTokens()', function () {
    it('should revert when ICO not started', async function () {
      await this.crowdsale.send(value).should.be.rejectedWith('revert');
      await this.crowdsale.buyTokens(employee1, { value: value, from: creator }).should.be.rejectedWith('revert');
    });

    it('should revert when ICO paused', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.pauseICO();
      await this.crowdsale.send(value).should.be.rejectedWith('revert');
      await this.crowdsale.buyTokens(employee1, { value: value, from: creator }).should.be.rejectedWith('revert');
    });

    it('should revert when msg.value < minPurchase', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(minPurchase-1).should.be.rejectedWith('revert');
      await this.crowdsale.buyTokens(employee1, { value: minPurchase-1, from: creator }).should.be.rejectedWith('revert');
    });

    it('should revert when msg.value > maxPurchase', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(maxPurchase+1).should.be.rejectedWith('revert');
      await this.crowdsale.buyTokens(employee1, { value: maxPurchase+1, from: creator }).should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      const isCanDo = await daoBase.isCanDoAction(this.crowdsale.address,issueTokens);
      assert.strictEqual(isCanDo,true);
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(value, {gasPrice: 0});
      let balance = await token.balanceOf(creator);
      assert.strictEqual(balance.toNumber(), value);
    });
  });

  describe('emergencyStop()', function () {
    it('should revert when not owner call', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.emergencyStop({ from: employee1 }).should.be.rejectedWith('revert');
    });

    it('should revert when ICO not open', async function () {
      await this.crowdsale.emergencyStop({ from: creator }).should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.emergencyStop({ from: creator });
    });
  });

  describe('pauseICO()', function () {
    it('should revert when not owner call', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.pauseICO({ from: employee1 }).should.be.rejectedWith('revert');
    });

    it('should revert when ICO already paused', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.pauseICO();
      await this.crowdsale.pauseICO().should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.pauseICO();
    });
  });

  describe('unpauseICO()', function () {
    it('should revert when not owner call', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.pauseICO();
      await this.crowdsale.unpauseICO({ from: employee1 }).should.be.rejectedWith('revert');
    });

    it('should revert when ICO not paused', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.unpauseICO().should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.pauseICO();
      await this.crowdsale.unpauseICO();
    });
  });

  describe('distributeBeforeICO()', function () {
    it('should revert when not owner call', async function () {
      await this.crowdsale.distributeBeforeICO([employee1,employee2,employee3], [10,20,30], { from: employee4 }).should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await this.crowdsale.distributeBeforeICO([employee1,employee2,employee3], [10,20,30]);
      let balance = await token.balanceOf(employee1);
      assert.strictEqual(balance.toNumber(), 10);
      balance = await token.balanceOf(employee2);
      assert.strictEqual(balance.toNumber(), 20);
      balance = await token.balanceOf(employee3);
      assert.strictEqual(balance.toNumber(), 30);
    });

    it('should revert when ICO started', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.distributeBeforeICO([employee1,employee2,employee3], [10,20,30]).should.be.rejectedWith('revert');
    });

    it('should revert when empty array addresses', async function () {
      await this.crowdsale.distributeBeforeICO([], []).should.be.rejectedWith('revert');
    });

    it('should revert when differen array length', async function () {
      await this.crowdsale.distributeBeforeICO([employee1,employee2,employee3], [10,30]).should.be.rejectedWith('revert');
    });
  });

  describe('distributeAfterICO()', function () {
    it('should revert when not owner call', async function () {
      await increaseTimeTo(duration.weeks(2));
      await this.crowdsale.distributeAfterICO([employee1,employee2,employee3], [10,20,30], {from: employee4}).should.be.rejectedWith('revert');
    });

    it('should revert when ICO not finished yet', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.distributeAfterICO([employee1,employee2,employee3], [10,20,30]).should.be.rejectedWith('revert');
    });

    it('should revert when empty array addresses', async function () {
      await increaseTimeTo(duration.weeks(2));
      await this.crowdsale.distributeAfterICO([], []).should.be.rejectedWith('revert');
    });

    it('should revert when differen array length', async function () {
      await increaseTimeTo(duration.weeks(2));
      await this.crowdsale.distributeAfterICO([employee1,employee2,employee3], [10,20]).should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(softCap);
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.distributeAfterICO([employee1,employee2,employee3], [10,20,30]);
      let balance = await token.balanceOf(employee1);
      assert.strictEqual(balance.toNumber(), 10);
      balance = await token.balanceOf(employee2);
      assert.strictEqual(balance.toNumber(), 20);
      balance = await token.balanceOf(employee3);
      assert.strictEqual(balance.toNumber(), 30);
    });
  });

  describe('addToWhiteList()', function () {
    it('should revert when not owner call', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.addToWhitelist(employee1, {from: employee2}).should.be.rejectedWith('revert');
    });

    it('should revert when ICO ended', async function () {
      await increaseTimeTo(duration.weeks(3));
      await this.crowdsale.addToWhitelist(employee1).should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.addToWhitelist(employee1);
    });
  });

  describe('forwardFunds()', function () {
    it('should revert when not owner call', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(softCap);
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.forwardFunds(employee1, { from: employee2 }).should.be.rejectedWith('revert');
    });

    it('should revert when ICO not ended success yet', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(softCap);
      await this.crowdsale.forwardFunds(employee1, { from: employee2 }).should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(softCap);
      await increaseTimeTo(duration.weeks(1));

      let balanceBefore = web3.eth.getBalance(employee1).toNumber();
      await this.crowdsale.forwardFunds(employee1, {gasPrice: 0});
      let balanceAfter = web3.eth.getBalance(employee1).toNumber();
      assert.strictEqual(balanceBefore+softCap, balanceAfter-10000); // - gas 
    });
  });

  describe('refund()', function () {
    it('should revert when ICO not failed', async function () {
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.send(softCap);
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.refund().should.be.rejectedWith('revert');
    });

    it('should pass', async function () {
      await increaseTimeTo(duration.weeks(1));
      let balanceBefore = web3.eth.getBalance(creator).toNumber();
      await this.crowdsale.buyTokens(employee1, { value: value, from: creator, gasPrice: 0 });
      let balanceAfter = web3.eth.getBalance(creator).toNumber();
      assert.notEqual(balanceBefore,balanceAfter);
      await increaseTimeTo(duration.weeks(1));
      await this.crowdsale.refund({ gasPrice: 0 });
      let balanceAfterRefund = web3.eth.getBalance(creator).toNumber();
      assert.strictEqual(balanceBefore,balanceAfterRefund);
    });
  });
});