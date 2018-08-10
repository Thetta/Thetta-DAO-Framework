var DaoLib = artifacts.require("./DaoLib");
var DaoBase = artifacts.require("./DaoBase");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var DaoBaseWithUnpackersMock = artifacts.require("./DaoBaseWithUnpackersMock");
var DaoBaseMock = artifacts.require("./DaoBaseMock");

module.exports = function (deployer) {
	deployer.deploy(DaoLib).then(() => {
		deployer.link(DaoLib, DaoBase);
		deployer.link(DaoLib, DaoBaseWithUnpackers);
		deployer.link(DaoLib, DaoBaseWithUnpackersMock);
		deployer.link(DaoLib, DaoBaseMock);
		
	});
};

