var ConversionLib = artifacts.require("./ConversionLib") ;
// var VotingLib = artifacts.require("./ConversionLib") ;
var DaoBase = artifacts.require("./DaoBase") ;
// var MoneyflowAuto = artifacts.require("./MoneyflowAuto") ;

module.exports = function (deployer) {
	deployer.deploy(ConversionLib).then(() => {
	deployer.link(ConversionLib, DaoBase);
  // 	deployer.link(VotingLib, GenericCaller);
  // 	deployer.link(VotingLib, MoneyflowAuto);
	});
};
