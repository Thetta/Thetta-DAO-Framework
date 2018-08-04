var ConversionLib = artifacts.require("./ConversionLib") ;

//var DaoBase = artifacts.require("./DaoBase") ;
var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers") ;
var GenericCaller = artifacts.require("./GenericCaller") ;

module.exports = function (deployer) {
	deployer.deploy(ConversionLib).then(() => {
		//deployer.link(ConversionLib, DaoBase);
		deployer.link(ConversionLib, DaoBaseWithUnpackers);
		deployer.link(ConversionLib, GenericCaller);
	});
};
