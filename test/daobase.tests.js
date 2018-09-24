var DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');
var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');
var DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');
var GenericProposal = artifacts.require("./GenericProposal");
var DaoClient = artifacts.require("./DaoClient");

// to check how upgrade works with IDaoBase clients

var MoneyFlow = artifacts.require('./MoneyFlow');
var IWeiReceiver = artifacts.require('./IWeiReceiver');
var IProposal = artifacts.require('./IProposal');

function KECCAK256 (x) {
  return web3.sha3(x);
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('DaoBase', (accounts) => {
  let token;
  let daoBase;
  let store;
  let issueTokens;
  let manageGroups;
  let addNewProposal;
  let upgradeDaoContract;
  let addNewTask;
  let startTask;
  let startBounty;
  let modifyMoneyscheme;
  let withdrawDonations;
  let setRootWeiReceiver;
  let burnTokens;
  let daoClient;
  let proposal;

  const creator = accounts[0];
  const employee1 = accounts[1];
  const employee2 = accounts[2];
  const outsider = accounts[3];
  const employee3 = accounts[4];

  before(async() => {

  });

  beforeEach(async() => {
    token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
    await token.mintFor(creator, 1000);
    store = await DaoStorage.new([token.address],{from: creator});
    daoBase = await DaoBaseWithUnpackers.new(store.address,{from: creator});
    
    issueTokens = await daoBase.ISSUE_TOKENS();
    manageGroups = await daoBase.MANAGE_GROUPS();
    upgradeDaoContract = await daoBase.UPGRADE_DAO_CONTRACT();
    withdrawDonations = await daoBase.WITHDRAW_DONATIONS();
    addNewProposal = await daoBase.ADD_NEW_PROPOSAL();
    burnTokens = await daoBase.BURN_TOKENS();

    await store.addGroupMember(web3.sha3("Employees"), creator);

    // do not forget to transfer ownership
    await token.transferOwnership(daoBase.address);
    await store.transferOwnership(daoBase.address);

    // Set permissions:
    await daoBase.allowActionByAnyMemberOfGroup(addNewProposal, "Employees");
    await daoBase.allowActionByAnyMemberOfGroup(burnTokens, "Employees");
    await daoBase.allowActionByAnyMemberOfGroup(upgradeDaoContract, 'Employees');
    await daoBase.allowActionByAddress(withdrawDonations, creator);
    await daoBase.allowActionByVoting(issueTokens, token.address);
    await daoBase.allowActionByVoting(upgradeDaoContract, token.address); 
  });

  describe('addObserver()', function () {
    it('Should add observer to daoBase',async() => {
      daoClient = await DaoClient.new(daoBase.address);
      await daoBase.addObserver(daoClient.address);
      await assert.equal(await daoBase.getObserversCount(), 2);
      await assert.equal(await daoBase.getObserverAtIndex(0), daoClient.address);
    });
  });

  describe('onUpgrade()', function () {
    it('Should revert if call is not from daoBase',async() => {
      daoClient = await DaoClient.new(daoBase.address);
      await daoBase.addObserver(daoClient.address);
      await daoClient.onUpgrade(accounts[5],{from:creator}).should.be.rejectedWith('revert');
    });
  });

  describe('getMembersCount()', function () {
    it('Should return correct value',async() => {
      await daoBase.addGroupMember("", employee1).should.be.rejectedWith('revert');
      await daoBase.addGroupMember("Employees", employee1);
      assert.equal(await daoBase.getMembersCount("Employees"), 2);
    });
  });

  describe('getGroupMembers()', function () {
    it('Should return correct value',async() => {
      await daoBase.addGroupMember("Employees", employee2);
      let members = await daoBase.getGroupMembers("Employees");
      assert.equal(members.length, 2);
    });
  });

  describe('removeGroupMember()', function () {
    it('Should revert due to call whithout rights',async() => {
      await daoBase.removeGroupMember("Employees", employee2, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should remove member from daoBase',async() => {
      await daoBase.addGroupMember("Employees", employee1);
      assert.equal(await daoBase.isGroupMember("Employees", employee1), true);

      await daoBase.removeGroupMember("Employees", employee1);

      let members = await daoBase.getGroupMembers("Employees");
      assert.equal(members.length, 1);
      assert.equal(await daoBase.isGroupMember("Employees", employee1), false);
    });
  });
  describe('isGroupMember()', function () {
    it('Should return false',async() => {
      assert.equal(await daoBase.isGroupMember("Employees", outsider), false);
    });

    it('Should return true',async() => {
      assert.equal(await daoBase.isGroupMember("Employees", creator), true);
    });
  });

  describe('getMemberByIndex()', function () {
    it('Should return creator',async() => {
      assert.equal(await daoBase.getMemberByIndex("Employees", 0), creator);
    });
  });

  describe('allowActionByVoting()', function () {
    it('Should not be able allow action by outsider before renounce ownership',async() => {
      token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
      await daoBase.allowActionByVoting(addNewProposal, token.address, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should not be able allow action by outsider after renounce ownership',async() => {
      token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
      await daoBase.renounceOwnership();
      await daoBase.allowActionByVoting(addNewProposal, token.address, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should be able allow action by creator before renounce ownership',async() => {
      token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
      await daoBase.allowActionByVoting(addNewProposal, token.address);
    });

    it('Should not be able allow action by creator after renounce ownership',async() => {
      token = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
      await daoBase.renounceOwnership();
      await daoBase.allowActionByVoting(addNewProposal, token.address).should.be.rejectedWith('revert');
    });
  });

  describe('allowActionByShareholder()', function () {
    it('Should not be able allow action by shareholder by outsider before renounce ownership',async() => {
      await daoBase.allowActionByShareholder(addNewProposal, token.address, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should not be able allow action by shareholder by outsider after renounce ownership',async() => {
      await daoBase.renounceOwnership();
      await daoBase.allowActionByShareholder(addNewProposal, token.address, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should be able allow action by shareholder by creator before renounce ownership',async() => {
      await daoBase.allowActionByShareholder(addNewProposal, token.address);
    });

    it('Should not be able allow action by shareholder by creator after renounce ownership',async() => {
      await daoBase.renounceOwnership();
      await daoBase.allowActionByShareholder(addNewProposal, token.address).should.be.rejectedWith('revert');
    });
  });

  describe('allowActionByAddress()', function () {
    it('Should not be able allow action by shareholder by outsider before renounce ownership',async() => {
      await daoBase.allowActionByAddress(addNewProposal, employee3, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should not be able allow action by outsider after renounce ownership',async() => {
      await daoBase.renounceOwnership();
      await daoBase.allowActionByAddress(addNewProposal, employee3, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should be able allow action by creator before renounce ownership',async() => {
      await daoBase.allowActionByAddress(addNewProposal, employee3);
    });

    it('Should not be able allow action by creator after renounce ownership',async() => {
      await daoBase.renounceOwnership();
      await daoBase.allowActionByAddress(addNewProposal, employee3).should.be.rejectedWith('revert');
    });
  });

  describe('allowActionByAnyMemberOfGroup()', function () {
    it('Should not be able allow action by shareholder by outsider before renounce ownership',async() => {
      await daoBase.allowActionByAnyMemberOfGroup(addNewProposal, "Employees", {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should not be able allow action by outsider after renounce ownership',async() => {
      await daoBase.renounceOwnership();
      await daoBase.allowActionByAnyMemberOfGroup(addNewProposal, "Employees", {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should be able allow action by creator before renounce ownership',async() => {
      await daoBase.addGroupMember("Employees", employee3);
      assert.equal(await daoBase.isGroupMember("Employees", employee3), true);
      await daoBase.allowActionByAnyMemberOfGroup(addNewProposal, "Employees");
      assert.equal(await daoBase.isCanDoAction(employee3, addNewProposal), true);
    });

    it('Should not be able allow action by creator after renounce ownership',async() => {
      await daoBase.renounceOwnership();
      await daoBase.addGroupMember("Employees", employee3).should.be.rejectedWith('revert');
      assert.equal(await daoBase.isGroupMember("Employees", employee3), false);
      await daoBase.allowActionByAnyMemberOfGroup(addNewProposal, "Employees").should.be.rejectedWith('revert');
      assert.equal(await daoBase.isCanDoAction(employee3, addNewProposal), false);
    });
  });

  describe('addNewProposal()', function () {
    it('Should revert due to call allow action without outsider',async() => {
      proposal = await GenericProposal.new(creator, creator, '', []);
      await daoBase.addNewProposal(proposal.address, {from: outsider}).should.be.rejectedWith('revert');
    });

    it('Should remove member from daoBase',async() => {
      proposal = await GenericProposal.new(creator, creator, '', []);
      await daoBase.addNewProposal(proposal.address);
    });
  });

  describe('getProposalAtIndex()', function () {
    it('Should return correct value',async() => {
      proposal = await GenericProposal.new(creator, creator, '', []);
      await daoBase.addNewProposal(proposal.address);
      assert.equal(await daoBase.getProposalAtIndex(0), proposal.address);
    });
  });

  describe('getProposalsCount()', function () {
    it('Should return correct value',async() => {
      proposal = await GenericProposal.new(creator, creator, '', []);
      await daoBase.addNewProposal(proposal.address);
      let amount = await daoBase.getProposalsCount();
      assert.equal(amount.toNumber(), 1);
    });
  });

  it('should set everything correctly',async() => {
    const isMember = await daoBase.isGroupMember("Employees", creator);
    assert.equal(isMember,true,'Permission should be set correctly');

    const isMember2 = await daoBase.isGroupMember("Employees", employee1);
    assert.equal(isMember2,false,'Permission should be set correctly');

    const isCan = await daoBase.isCanDoByGroupMember(addNewProposal, creator);
    assert.equal(isCan,true,'Any employee should be able to add new proposal');

    const isCan2 = await daoBase.isCanDoAction(creator, addNewProposal);
    assert.equal(isCan2,true,'Creator should be able to call addNewProposal directly');
  });

  it('should return correct permissions for an outsider',async() => {
    const isCanDo1 = await daoBase.isCanDoAction(outsider,addNewProposal);
    assert.strictEqual(isCanDo1,false,'Outsider should not be able to do that ');

    const isCanDo2 = await daoBase.isCanDoAction(outsider,manageGroups);
    const isCanDo3 = await daoBase.isCanDoAction(outsider,issueTokens);
    assert.strictEqual(isCanDo2,false,'Outsider should not be able to do that because he is in majority');
    assert.strictEqual(isCanDo3,false,'Outsider should not be able to do that because he is in majority');
  });

  it('should return correct permissions for creator',async() => {
    const isCanDo1 = await daoBase.isCanDoAction(creator,addNewProposal);
    assert.strictEqual(isCanDo1,true,'Creator should be able to do that ');

    const isCanDo2 = await daoBase.isCanDoAction(creator,manageGroups);
    const isCanDo3 = await daoBase.isCanDoAction(creator,issueTokens);
    assert.strictEqual(isCanDo2,false,'Creator should not be able to do that');
    assert.strictEqual(isCanDo3,true,'Creator should be able to do that because he is in majority');
  });

  it('should not add new vote if not employee',async() => {
    // employee1 is still not added to DaoBase as an employee
    let newProposal = 0x123;
    await daoBase.addNewProposal.sendTransaction(newProposal, {from: employee1}).should.be.rejectedWith('revert');
  });

  it('should issue tokens to employee1 and employee2', async () => {
    // currently creator has 1000 tokens, he is in majority, so this should not fail
    await daoBase.issueTokens(token.address, employee1, 2000);

    // but now creator has 1000 and employee1 has 1000, so creator is not in majority
    // this should fail
    // Should not issue more tokens because creator is no longer in majority
    await daoBase.issueTokens.sendTransaction(token.address, employee2, 1000, { from: creator }).should.be.rejectedWith('revert');

    await token.transfer(employee2, 1000, { from: employee1 });

    // CHECK this .at syntax!!!
    const balance1 = await token.balanceOf(creator);
    assert.equal(balance1, 1000, 'initial balance');

    const balance2 = await token.balanceOf(employee1);
    assert.equal(balance2, 1000, 'employee1 balance');

    const balance3 = await token.balanceOf(employee2);
    assert.equal(balance3, 1000, 'employee2 balance');
  });

  it('should not issue tokens to employee1', async () => {
    // currently creator has 1000 tokens, he is in majority, so this should not fail
    let falseToken = accounts[5];
    await daoBase.issueTokens(falseToken, employee1, 2000).should.be.rejectedWith('revert');
  });

  it('should not burn tokens to employee1', async () => {
    // currently creator has 1000 tokens, he is in majority, so this should not fail
    let falseToken = accounts[5];
    await daoBase.issueTokens(token.address, employee1, 1000);
    await daoBase.burnTokens(token.address, employee1, 500);
    await daoBase.burnTokens(falseToken, employee1, 500).should.be.rejectedWith('revert');
  });  

  it('should be able to upgrade', async () => {
    // one client of the IDaoBase (to test how upgrade works with it)
    let moneyflowInstance = await MoneyFlow.new(daoBase.address);

    let a1 = await token.owner();
    assert.equal(a1, daoBase.address, 'Ownership should be set');

    // UPGRADE!
    let daoBaseNew = await DaoBaseWithUnpackers.new(store.address, { from: creator });
    await daoBase.upgradeDaoContract(daoBaseNew.address, { from: creator });

    let a2 = await token.owner();
    assert.equal(a2, daoBaseNew.address, 'Ownership should be transferred');

    await daoBaseNew.issueTokens(token.address, employee1, 1000);

    // check employee1 balance
    const balance1 = await token.balanceOf(employee1);
    assert.equal(balance1, 1000, 'balance should be updated');

    await daoBaseNew.addGroupMember('Employees', employee1);
    const isEmployeeAdded = await daoBaseNew.isGroupMember('Employees', employee1);
    assert.strictEqual(isEmployeeAdded, true, 'employee1 should be added as the company`s employee');

    // Should not add new employee to old MC
    await daoBase.addGroupMember(web3.sha3('Employees'), employee2, { from: creator }).should.be.rejectedWith('revert');
    // Should not issue tokens through MC
    await daoBase.issueTokens(token.address, employee2, 100, { from: creator }).should.be.rejectedWith('revert');

    // now try to withdraw donations with new mc
    const money = 1e15;
    const dea = await moneyflowInstance.getDonationEndpoint();
    const donationEndpoint = await IWeiReceiver.at(dea);
    await donationEndpoint.processFunds(money, { from: creator, value: money, gasPrice: 0 });

    let donationBalance = await web3.eth.getBalance(donationEndpoint.address);
    assert.equal(donationBalance.toNumber(), money, 'all money at donation point now');

    // withdraw
    let outBalance = await web3.eth.getBalance(outsider);

    await moneyflowInstance.withdrawDonationsTo(outsider, { from: creator, gasPrice: 0 });

    let outBalance2 = await web3.eth.getBalance(outsider);
    let balanceDelta = outBalance2.toNumber() - outBalance.toNumber();

    assert.equal(balanceDelta, money, 'all donations now on outsiders`s balance');

    let donationBalance2 = await web3.eth.getBalance(donationEndpoint.address);
    assert.equal(donationBalance2.toNumber(), 0, 'all donations now on creator`s balance');
  });

  it('should add group members', async () => {
    await daoBase.addGroupMember('Employees', employee1);
    await daoBase.addGroupMember('Employees', employee2);
    await daoBase.addGroupMember('Employees', employee3);

    // Shouldnt add again
    await daoBase.addGroupMember('Employees', employee3).should.be.rejectedWith('revert');

    assert.strictEqual(await daoBase.isGroupMember('Employees', employee1),
      true, 'Should be in the group');
    assert.strictEqual(await daoBase.isGroupMember('Employees', employee2),
      true, 'Should be in the group');
    assert.strictEqual(await daoBase.isGroupMember('Employees', employee3),
      true, 'Should be in the group');

    assert.equal(4, await daoBase.getMembersCount('Employees'), '3 employees + creator');

    await daoBase.removeGroupMember('Employees', employee3, { from: creator });

    assert.strictEqual(await daoBase.isGroupMember('Employees', employee3),
      false, 'Should not be in the group');

    // await daoBase.getGroupParticipants
    assert.equal(3, (await daoBase.getMembersCount('Employees')).toNumber(), '2 employees + creator');
  });

  it('should burn tokens', async () => {
    let balance = await token.balanceOf(creator);
    await daoBase.burnTokens(token.address, creator, 1000);
    let balance2 = await token.balanceOf(creator);
    let balanceDelta = balance.toNumber() - balance2.toNumber();
    assert.equal(balanceDelta, 1000);
  });

  it('should not either burn or mint tokens', async () => {
    await token.burnFor(creator, 1000, { from: creator }).should.be.rejectedWith('revert');
    await token.burnFor(creator, 1000, { from: employee1 }).should.be.rejectedWith('revert');
    await token.burnFor(creator, 1000, { from: outsider }).should.be.rejectedWith('revert');
    await token.mintFor(creator, 1000, { from: creator }).should.be.rejectedWith('revert');
    await token.mintFor(creator, 1000, { from: employee1 }).should.be.rejectedWith('revert');
    await token.mintFor(creator, 1000, { from: outsider }).should.be.rejectedWith('revert');
  });
});
