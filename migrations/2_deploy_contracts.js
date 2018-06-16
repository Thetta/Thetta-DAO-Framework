var Splitter = artifacts.require("./Splitter") ;
var SplitterLib = artifacts.require("./SplitterLib") ;

module.exports = function (deployer) {
	deployer.deploy(SplitterLib).then(() => {
		deployer.link(SplitterLib, Splitter);
		return deployer.deploy(Splitter,['0x04b12cE6512Cce5827e964B00E34E6AD2B9AC852']);
	});
};