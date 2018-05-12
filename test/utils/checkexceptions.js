// eslint-disable-next-line import/prefer-default-export
async function checkContractThrows(functionObj, functionParams = [], checkFailedMsg = null) {
	if (typeof functionObj === 'undefined' || functionObj === null) {
		throw Error('Function is not defined.');
	}
	let isCaught = false;
	try {
		await functionObj(...functionParams);
	} catch (err) {
		if (err.message.includes('is not a function')) { throw err; }
		// todo check that there is no problem with arguments list
		// number of args should match func signature
		// types should match function signature
		// generally truffle should make these checks
		isCaught = true;
	}
	global.assert.strictEqual(isCaught, true,
		(checkFailedMsg === null) ? 'Expected that function call throws' : checkFailedMsg);
}

exports.checkContractThrows = checkContractThrows;
