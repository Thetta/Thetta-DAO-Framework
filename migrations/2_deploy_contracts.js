var ConversionLib = artifacts.require("./ConversionLib");

//var DaoBase = artifacts.require("./DaoBase");
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var GenericCaller = artifacts.require("./GenericCaller");
var GenericCallerLib = artifacts.require("./GenericCallerLib");
var MoneyflowAuto = artifacts.require("./MoneyflowAuto");

module.exports = function (deployer) {
	deployer.deploy(GenericCallerLib).then(() => {
		//deployer.link(ConversionLib, DaoBase);
		// deployer.link(ConversionLib, DaoBaseWithUnpackers);
		
		deployer.link(GenericCallerLib, DaoBaseWithUnpackers);
		deployer.link(GenericCallerLib, GenericCaller);
		deployer.link(GenericCallerLib, MoneyflowAuto);
	});
};
