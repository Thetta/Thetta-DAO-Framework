var ConversionLib = artifacts.require("./ConversionLib") ;
// var VotingLib = artifacts.require("./ConversionLib") ;
var DaoBase = artifacts.require("./DaoBase") ;
var GenericCaller = artifacts.require("./GenericCaller") ;
// var MoneyflowAuto = artifacts.require("./MoneyflowAuto") ;

module.exports = function (deployer) {
	deployer.deploy(ConversionLib).then(() => {
	deployer.link(ConversionLib, DaoBase);
   	deployer.link(ConversionLib, GenericCaller);
  // 	deployer.link(VotingLib, MoneyflowAuto);
	});
};
