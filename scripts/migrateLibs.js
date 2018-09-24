function migrateLibs (artifacts, deployer, network, accounts) {
	var UtilsLib = artifacts.require("./UtilsLib");
	var DaoBase = artifacts.require("./DaoBase");
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
	var DaoBaseLib = artifacts.require("./DaoBaseLib");

	return deployer
		.then(() => deployer.deploy(UtilsLib))
		.then(() => deployer.link(UtilsLib, [DaoBaseImpersonated, DaoBaseWithUnpackers, GenericCaller, VotingLib, DaoBaseAuto, DaoBaseWithUnpackersMock, DaoBaseMock, DaoStorage, StdDaoToken]))	
		.then(() => deployer.deploy(VotingLib))
		.then(() => deployer.link(VotingLib, [GenericCaller, GenericCallerLib, MoneyflowAuto, DaoBaseAuto]))
		.then(() => deployer.deploy(GenericCallerLib))
		.then(() => deployer.link(GenericCallerLib, [GenericCaller, MoneyflowAuto, DaoBaseAuto]))
		.then(() => deployer.deploy(DaoBaseLib))
		.then(() => deployer.link(DaoBaseLib, [DaoBase, DaoBaseWithUnpackers, DaoBaseWithUnpackersMock, DaoBaseMock]))
};

module.exports = migrateLibs