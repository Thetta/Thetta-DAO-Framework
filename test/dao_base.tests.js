/*require('chai').use(require('chai-as-promised')).should();

const DaoBase = artifacts.require('./DaoBase');
const StdDaoToken = artifacts.require('./StdDaoToken');

contract('DaoBase', (accounts) => {
  const creatorAddress = accounts[0];
  const userAddress = accounts[1];

  let daoBase;
  let token;

  beforeEach(async () => {
    token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
    daoBase = await DaoBase.new([token.address], { from: creatorAddress });
  
		await daoBase.easyEditOff();
	});

  describe('test getMemberByIndex()', () => {
    it('on existing group hash and index returns user address', async () => {
      await daoBase.addGroupMember('ANY_GROUP', userAddress);
      let actualAddress = await daoBase.getMemberByIndex('ANY_GROUP', 0);
      assert.equal(actualAddress, userAddress);
    });

    it('on invalid group name throws', async () => {
      await daoBase.getMemberByIndex('INVALID_GROUP', 0).should.be.rejectedWith('revert');
    });

    it('on invalid index throws', async () => {
      await daoBase.addGroupMember('ANY_GROUP', userAddress);
      await daoBase.getMemberByIndex('ANY_GROUP', 1).should.be.rejectedWith('revert');
    });
  });
});
*/