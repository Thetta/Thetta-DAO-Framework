var ThettaCoin = artifacts.require("./ThettaCoin.sol");

contract('ThettaCoin', function(accounts) {
  it("should put 10000 ThettaCoin in the first account", function() {
    return ThettaCoin.deployed().then(function(instance) {
      return instance.getBalance.call(accounts[0]);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    });
  });

});
