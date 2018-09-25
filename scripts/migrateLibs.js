function migrateLibs (artifacts, deployer, network, accounts) {

	async function linkIfExist(lib, contractName){
		try {
			await deployer.link(lib, artifacts.require(contractName));
		} catch(error) {

		}
	}

	return deployer.then(async () => {		
		var UtilsLib = artifacts.require("./UtilsLib");
		var GenericCallerLib = artifacts.require("./GenericCallerLib");
		var VotingLib = artifacts.require("./VotingLib");
		var DaoBaseLib = artifacts.require("./DaoBaseLib");

		await deployer.deploy(UtilsLib);
		await deployer.link(UtilsLib, VotingLib);
		await deployer.deploy(VotingLib);
		await deployer.link(VotingLib, GenericCallerLib);
		await deployer.deploy(GenericCallerLib);
		await deployer.deploy(DaoBaseLib);

		await linkIfExist(UtilsLib, "./DaoBaseImpersonated");
		await linkIfExist(UtilsLib, "./DaoBaseWithUnpackers");
		await linkIfExist(UtilsLib, "./GenericCaller");
		await linkIfExist(UtilsLib, "./VotingLib");
		await linkIfExist(UtilsLib, "./DaoBaseAuto");
		await linkIfExist(UtilsLib, "./DaoBaseWithUnpackersMock");
		await linkIfExist(UtilsLib, "./DaoBaseMock");
		await linkIfExist(UtilsLib, "./DaoStorage");
		await linkIfExist(UtilsLib, "./StdDaoToken");

		await linkIfExist(VotingLib, "./Voting");
		await linkIfExist(VotingLib, "./GenericCallerLib");
		await linkIfExist(VotingLib, "./GenericCaller");
		await linkIfExist(VotingLib, "./MoneyflowAuto");
		await linkIfExist(VotingLib, "./DaoBaseAuto");
		
		await linkIfExist(GenericCallerLib, "./GenericCaller");
		await linkIfExist(GenericCallerLib, "./MoneyflowAuto");
		await linkIfExist(GenericCallerLib, "./DaoBaseAuto");

		await linkIfExist(DaoBaseLib, "./DaoBase");
		await linkIfExist(DaoBaseLib, "./DaoBaseWithUnpackers");
		await linkIfExist(DaoBaseLib, "./DaoBaseWithUnpackersMock");
		await linkIfExist(DaoBaseLib, "./DaoBaseMock");
	});
};

module.exports = migrateLibs