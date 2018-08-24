var UtilsLib = artifacts.require("./UtilsLib");

//var DaoBase = artifacts.require("./DaoBase");
var DaoBaseImpersonated = artifacts.require("./DaoBaseImpersonated");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var GenericCaller = artifacts.require("./GenericCaller");
var GenericCallerLib = artifacts.require("./GenericCallerLib");
var MoneyflowAuto = artifacts.require("./MoneyflowAuto");
var Voting = artifacts.require("./Voting");
var VotingLib = artifacts.require("./VotingLib");
var DaoBaseAuto = artifacts.require("./DaoBaseAuto");
var DaoBaseWithUnpackersMock = artifacts.require("./DaoBaseWithUnpackersMock");
var DaoStorage = artifacts.require("./DaoStorage");
var DaoBaseMock = artifacts.require("./DaoBaseMock");
var StdDaoToken = artifacts.require("./StdDaoToken");

module.exports = function (deployer) {
	deployer.deploy(UtilsLib).then(() => {
		deployer.link(UtilsLib, DaoBaseImpersonated);
		deployer.link(UtilsLib, DaoBaseWithUnpackers);
		deployer.link(UtilsLib, GenericCaller);
		deployer.link(UtilsLib, VotingLib);
		// deployer.link(UtilsLib, MoneyflowAuto);
		deployer.link(UtilsLib, DaoBaseAuto);
		deployer.link(UtilsLib, DaoBaseWithUnpackersMock);
		deployer.link(UtilsLib, DaoBaseMock);
		deployer.link(UtilsLib, DaoStorage);
		deployer.link(UtilsLib, StdDaoToken);
		// deployer.link(UtilsLib, Voting);
		// deployer.link(UtilsLib, VotingLib);
	});
};
