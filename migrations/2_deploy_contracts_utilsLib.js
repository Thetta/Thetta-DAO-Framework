var UtilsLib = artifacts.require("./UtilsLib");

//var DaoBase = artifacts.require("./DaoBase");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var GenericCaller = artifacts.require("./GenericCaller");
var GenericCallerLib = artifacts.require("./GenericCallerLib");
var MoneyflowAuto = artifacts.require("./MoneyflowAuto");
var Voting = artifacts.require("./Voting");
var VotingLib = artifacts.require("./VotingLib");
var DaoBaseAuto = artifacts.require("./DaoBaseAuto");

module.exports = function (deployer) {
	deployer.deploy(UtilsLib).then(() => {
		deployer.link(UtilsLib, DaoBaseWithUnpackers);
		deployer.link(UtilsLib, GenericCaller);
		// deployer.link(UtilsLib, MoneyflowAuto);
		// deployer.link(UtilsLib, DaoBaseAuto);
		// deployer.link(UtilsLib, Voting);
		// deployer.link(UtilsLib, VotingLib);
	});
};
