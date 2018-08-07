var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var GenericCaller = artifacts.require("./GenericCaller");
var GenericCallerLib = artifacts.require("./GenericCallerLib");
var MoneyflowAuto = artifacts.require("./MoneyflowAuto");
var Voting = artifacts.require("./Voting");
var VotingLib = artifacts.require("./VotingLib");
var DaoBaseAuto = artifacts.require("./DaoBaseAuto");

module.exports = function (deployer) {
	deployer.deploy(VotingLib).then(() => {
		deployer.link(VotingLib, Voting);
		deployer.link(VotingLib, GenericCaller);
		deployer.link(VotingLib, GenericCallerLib);
		deployer.link(VotingLib, MoneyflowAuto);
		deployer.link(VotingLib, DaoBaseAuto);
	});
};
