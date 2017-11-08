var ThettaCoin = artifacts.require("./ThettaCoin.sol");

module.exports = function(deployer) {
  deployer.deploy(ThettaCoin);
};
