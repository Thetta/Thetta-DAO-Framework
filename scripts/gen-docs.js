const { spawn } = require('child_process');
spawn('./gen-docs.sh', ["zeppelin-solidity=" +__dirname.slice(0, -8) + "/node_modules/zeppelin-solidity"]);
