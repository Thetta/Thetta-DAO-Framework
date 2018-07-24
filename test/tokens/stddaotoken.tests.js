const BigNumber = web3.BigNumber;

const StdDaoToken = artifacts.require('StdDaoToken');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	.should();

	contract('StdDaoToken', (accounts) => {
		const creator = accounts[0];
		const employee3 = accounts[3];
		const employee4 = accounts[4];
		const employee5 = accounts[5];
		
		const ETH = 1000000000000000000;

		beforeEach(async function () {

		});

		describe('mintFor()', function () {
			it('should fail due to not owner call', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
				await this.token.mintFor(web3.eth.accounts[1], 1000, {from: web3.eth.accounts[1]}).should.be.rejectedWith('revert');
			});
				  
			it('should fail with isMintable = false', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, false, ETH);
				await this.token.mintFor(web3.eth.accounts[1], 1000);
			});

			it('should fail with cap < totalSupply', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, 100);
				await this.token.mintFor(web3.eth.accounts[1], 1000).should.be.rejectedWith('revert');
			});

			it('should fail due to finishMinting() call', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, 100);
				await this.token.finishMinting();
				await this.token.mintFor(web3.eth.accounts[1], 1000).should.be.rejectedWith('revert');
			});
				  
			it('should pass', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
				await this.token.mintFor(web3.eth.accounts[0], 1000);
				let balance = await this.token.balanceOf(web3.eth.accounts[0]);
				assert.equal(balance.toNumber(), 1000);
			});
		});

		describe('isHolder()', function () {
			it('should pass', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
				await this.token.mintFor(web3.eth.accounts[0], 1000);
				await this.token.mintFor(web3.eth.accounts[0], 1000);

				let balance = await this.token.balanceOf(web3.eth.accounts[0]);
				assert.equal(balance.toNumber(), 2000);

				await this.token.transfer(web3.eth.accounts[1],100);
				await this.token.transfer(web3.eth.accounts[1],100);

				balance = await this.token.balanceOf(web3.eth.accounts[1]);
				assert.equal(balance.toNumber(), 200);

				let account1 = this.token.holders(1);
				let account2 = this.token.holders(2);
				assert.notEqual(account1, account2);
				
				this.token.holders(3).should.be.rejectedWith('invalid opcode');
			});
		});

		describe('burnFor()', function () {
			it('should fail due to not owner call', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
				await this.token.burnFor(web3.eth.accounts[1], 1000, {from: web3.eth.accounts[1]}).should.be.rejectedWith('revert');
			});
				  
			it('should fail with isBurnable = false', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, false, ETH);
				await this.token.burnFor(web3.eth.accounts[0], 1000).should.be.rejectedWith('revert');
			});
				  
			it('should fail due to not enough tokens in the address provided', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
				await this.token.burnFor(web3.eth.accounts[0], 1000).should.be.rejectedWith('revert');
			});

			it('should pass', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
				await this.token.mintFor(web3.eth.accounts[0], 1000);
				await this.token.burnFor(web3.eth.accounts[0], 1000);
				let balance = await this.token.balanceOf(web3.eth.accounts[0]);
				assert.equal(balance.toNumber(), 0);
			});
		});

		describe('pause/unpause()', function () {
			it('should fail due to not owner call', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.pause({from: web3.eth.accounts[1]}).should.be.rejectedWith('revert');
				await this.token.unpause({from: web3.eth.accounts[1]}).should.be.rejectedWith('revert');
			});
				  
			it('should fail with isPausable = false', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, false, ETH);
				await this.token.pause().should.be.rejectedWith('revert');
				await this.token.unpause().should.be.rejectedWith('revert');
			});

			it('should pass', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.pause();
				await this.token.mintFor(web3.eth.accounts[0], 1000);
				await this.token.transfer(web3.eth.accounts[1], 100).should.be.rejectedWith('revert');
			});
		});

		describe('startNewVoting', function() {
			it('should not be possible to call by non-owner',async() => {
				// TODO:

			});

			it('should not be possible to call if paused',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.pause();
				await this.token.startNewVoting().should.be.rejectedWith('revert');
			});

			it('should not allow to create > 20 separate votings',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);

				await this.token.startNewVoting();//1
				await this.token.startNewVoting();//2
				await this.token.startNewVoting();//3
				await this.token.startNewVoting();//4
				await this.token.startNewVoting();//5
				await this.token.startNewVoting();//6
				await this.token.startNewVoting();//7
				await this.token.startNewVoting();//8
				await this.token.startNewVoting();//9
				await this.token.startNewVoting();//10
				await this.token.startNewVoting();//11
				await this.token.startNewVoting();//12
				await this.token.startNewVoting();//13
				await this.token.startNewVoting();//14
				await this.token.startNewVoting();//15
				await this.token.startNewVoting();//16
				await this.token.startNewVoting();//17
				await this.token.startNewVoting();//18
				await this.token.startNewVoting();//19
				await this.token.startNewVoting();//20
				await this.token.startNewVoting().should.be.rejectedWith('revert'); //should be revert();
			});
		});

		describe('getBalanceAtVoting()', function () {
			it('should preserve balances if no transfers happened after voting is started',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(employee4, 1);

				let employee4Balance = await this.token.balanceOf(employee4);
				let employee5Balance = await this.token.balanceOf(employee5);

				assert.equal(employee4Balance.toNumber(), 1);
				assert.equal(employee5Balance.toNumber(), 0);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				let employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);
				let employee5VotingBalance = await this.token.getBalanceAtVoting(votingID, employee5);

				assert.equal(employee4VotingBalance.toNumber(), 1);
				assert.equal(employee5VotingBalance.toNumber(), 0);
			});

			it('should preserve balances after voting is started',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.transfer(employee5, 1, {from: employee4});

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);
				employee5VotingBalance = await this.token.getBalanceAtVoting(votingID, employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				assert.equal(employee4VotingBalance.toNumber(), 1);
				assert.equal(employee5VotingBalance.toNumber(), 0);
			});

			it('should preserve balances in 2 different votings',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(employee4, 1);

				let tx = await this.token.startNewVoting();
				let events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.transfer(employee5, 1, {from: employee4});

				tx = await this.token.startNewVoting();
				events = tx.logs.filter(l => l.event == 'VotingStarted');
				const secondVotingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);
				employee5VotingBalance = await this.token.getBalanceAtVoting(votingID, employee5);

				let employee4SecondVotingBalance = await this.token.getBalanceAtVoting(secondVotingID, employee4);
				let employee5SecondVotingBalance = await this.token.getBalanceAtVoting(secondVotingID, employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				assert.equal(employee4VotingBalance.toNumber(), 1);
				assert.equal(employee5VotingBalance.toNumber(), 0);

				assert.equal(employee4SecondVotingBalance.toNumber(), 0);
				assert.equal(employee5SecondVotingBalance.toNumber(), 1);
			});

			it('should preserve balances after voting is started and burnFor called',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, true, true, ETH);
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.burnFor(employee4, 1);

				employee4Balance = await this.token.balanceOf(employee4);

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);

				assert.equal(employee4Balance.toNumber(), 0);

				assert.equal(employee4VotingBalance.toNumber(), 1);
			});

			it('should preserve balances after voting is started and mintFor called',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.mintFor(employee4, 1);

				employee4Balance = await this.token.balanceOf(employee4);

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);

				assert.equal(employee4Balance.toNumber(), 1);

				assert.equal(employee4VotingBalance.toNumber(), 0);
			});

			it('should throw exception when trying to check balancesAtVoting after voting is ended',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.transfer(employee5, 1, {from: employee4});

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				await this.token.finishVoting(votingID);

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4).should.be.rejectedWith('revert');
			});

			it('should preserve balances after voting is started and transferFrom is called',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.approve(employee3, 1, {from: employee4});
				await this.token.transferFrom(employee4, employee5, 1, {from: employee3});

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);
				employee5VotingBalance = await this.token.getBalanceAtVoting(votingID, employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				assert.equal(employee4VotingBalance.toNumber(), 1);
				assert.equal(employee5VotingBalance.toNumber(), 0);
			});
					 
			it('should throw exception because voting is not started yet', async function () {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(web3.eth.accounts[0], 1000);

				let balance1 = await this.token.getBalanceAtVoting(0, web3.eth.accounts[0]).should.be.rejectedWith('revert');
			});

			it('should work correctly even if new event is started',async() => {
				// TODO: 
				// 1 - create event 1
				// 2 - transfer tokens 
				// 3 - finish event 
				// 4 - create event 2
				// 5 - CHECK BALANCES
				// 6 - transfer tokens 
				// 7 - CHECK BALANCES 
				// 8 - finish event 
			});
		});

		describe('finishVoting()', function () {
			it('should not be possible to call by non-owner',async() => {
				// TODO:

			});

			it('should not be possible to call if paused',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.pause();
				await this.token.finishVoting(votingID).should.be.rejectedWith('revert');
			});

			it('should throw revert() if VotingID is wrong',async() => {
				this.token = await StdDaoToken.new("StdToken","STDT",18, false, true, ETH);
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewVoting();
				const events = tx.logs.filter(l => l.event == 'VotingStarted');
				const votingID = events.filter(e => e.args._address == creator)[0].args._votingID;

				await this.token.transfer(employee5, 1, {from: employee4});

				employee4VotingBalance = await this.token.getBalanceAtVoting(votingID, employee4);
				employee5VotingBalance = await this.token.getBalanceAtVoting(votingID, employee5);

				assert.equal(employee4VotingBalance.toNumber(), 1);
				assert.equal(employee5VotingBalance.toNumber(), 0);

				await this.token.finishVoting(75).should.be.rejectedWith('revert');
			});
		});
	})
