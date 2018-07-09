module.exports = {
	port: 8570,
	norpc: true,
	testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
	copyPackages: ['zeppelin-solidity'],
	skipFiles: [
        'moneyflow/erc20/Erc20Expense.sol',
        'moneyflow/erc20/Erc20Fund.sol',
        'moneyflow/erc20/Erc20Splitter.sol'
    ]
};
