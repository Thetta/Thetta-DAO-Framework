var Voting = artifacts.require("./Voting") ;
var VotingLib = artifacts.require("./VotingLib") ;

module.exports = function (deployer) {
	deployer.deploy(VotingLib).then(() => {
		deployer.link(VotingLib, Voting);
	});
};