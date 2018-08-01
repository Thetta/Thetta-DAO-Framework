/**
 * This script runs all tests with gas-reporter so you will see 
 * gas consumptions of all the tests along with gas consumptions
 * of contract deployments.
 * It works pretty dumb:
 * 1. Before starting tests the script updates reporter in truffle.js config:
 * reporter: 'spec' => reporter: 'eth-gas-reporter'
 * 2. Start of the tests.
 * 3. On test end/error/ctrl+c rollback reporter in truffle.js to standard 'spec'
 */

const fs = require('fs');
const { spawn } = require('child_process');

const filename = `${__dirname}/../truffle.js`;
const typeSpec = "reporter: 'spec'";
const typeEthGasReporter = "reporter: 'eth-gas-reporter'";

fs.readFile(filename, 'utf8', (err, data) => {
	if (err) return console.log(err);

	let text = data.replace(typeSpec, typeEthGasReporter);

	fs.writeFile(filename, text, 'utf8', (err) => {
		if (err) return console.log(err);
		
		// run tests
		const child = spawn('scripts/test.sh');
		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');

		child.stdout.on('data', (chunk) => {
			console.log(chunk);
		});

		child.stderr.on('data', (chunk) => {
			console.log(chunk);
		});

		child.on('close', () => {
			console.log(`child process closed`);
			rollback();
		});

		child.on('exit', () => {
			console.log(`child process exited`);
			rollback();
		});

		child.on('error', () => {
			console.log(`child process errored`);
			rollback();
		});

		process.on('SIGINT', () => {
			console.log(`child process iterrupted via CTRL+C`);
			rollback();
		});
  	});
});

function rollback() {
	fs.readFile(filename, 'utf8', (err, data) => {
		if (err) return console.log(err);
		let text = data.replace(typeEthGasReporter, typeSpec);
		fs.writeFile(filename, text, 'utf8', (err) => {
			if (err) return console.log(err);
		});
	});
}
