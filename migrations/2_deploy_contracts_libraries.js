var migrateLibs = require('../scripts/migrateLibs');

module.exports = function (deployer, network, accounts) {
	return migrateLibs(artifacts, [], deployer, network, accounts);
};
