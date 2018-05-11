module.exports = {
	//port: 6545,
	//testrpcOptions: '-p 6545 -u 0x54fd80d6ae7584d8e9a19fe1df43f04e5282cc43',
	//dir: './secretDirectory',
	
	norpc: true,
	testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
	copyPackages: ['zeppelin-solidity'],
	skipFiles: []
};
