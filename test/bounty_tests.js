var BountyItem = artifacts.require("./BountyItem.sol");

// 1 - Get accounts
var accounts;
var account1 = 0;
var admin = 0;

web3.eth.getAccounts(function(err,res) { 
     accounts = res; 
     account1 = accounts[0];
     admin = accounts[1];
});

// 2 - Functions
deployBounty = () => {
     var bounty;

     return BountyItem.new(admin,0,12,"test-project","test-desc",{gas: 10000000}).then((b) => {
          bounty = b;
          //return BountyItem.new();
     }).then(() => {
          return Promise.resolve(bounty);
     });
}

// 3 - Start tests
contract('BountyItem with ETH', function(accounts) {
     it("should create new ETH BountyItem", function(done) {
          var bounty;
          deployBounty()
               .then((b) => {
                    bounty = b;
                    return bounty.isTypeEth();
               })
               /*
               .then((res) => {
                    assert.equal(res,true);
                    return bounty.getCurrentState();
               })
               */
               .then((res) => {
                    //assert.equal(s,0);
                    assert.equal(res,true);
                    return bounty.project();
               })
               .then((p) => {
                    assert.equal(p,"test-project"); 
                    return bounty.desc();
               })
               .then((d) => {
                    assert.equal(d,"test-desc"); 
                    return bounty.totalClaims();
               })
               .then((claimsCount) => {
                    assert.equal(claimsCount,0); 
                    return bounty.admin();
               })
               .then((adminVal) => {
                    assert.equal(adminVal,admin); 
                    return bounty.creator();
               })
               .then((creatorVal) => {
                    assert.equal(creatorVal,account1);
                    done();
               });
     });

     /*
     it("should add funds to the bounty", function(done) {
          var bounty;
          deployBounty()
               .then((b) => {
                    bounty = b;
                    return bounty;
               })
               .then((b) => {
                    bounty = b;
                    return bounty.isTypeEth();
               })
               .then((bounty) => {
                      
                    done();
               });
     });
     */
});
