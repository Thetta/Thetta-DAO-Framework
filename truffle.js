require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8989,
      network_id: "*" // Match any network id
    }
  }
};
