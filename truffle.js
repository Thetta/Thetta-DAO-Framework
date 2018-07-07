require('babel-register');
require('babel-polyfill');

module.exports = {
	networks: {
		development: {
			host: "localhost",
			port: 8555,
			network_id: "*", // Match any network id
			gas: 10000000
		},
		coverage: {
			host:       'localhost',
			network_id: '*',
			port:       8570,
			gas:        0xfffffffffff,
			gasPrice:   0x01,
		}
	}
};
