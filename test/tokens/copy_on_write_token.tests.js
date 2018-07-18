const BigNumber = web3.BigNumber;

const CopyOnWriteTokenTestable = artifacts.require('CopyOnWriteTokenTestable');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	.should();

	contract('CopyOnWriteToken', (accounts) => {
		const creator = accounts[0];
		const employee3 = accounts[3];
		const employee4 = accounts[4];
		const employee5 = accounts[5];
		
		beforeEach(async function () {

		});

		describe('startNewEvent', function() {
			it('should not allow to create > 20 separate events',async() => {
				this.token = await CopyOnWriteTokenTestable.new();

				await this.token.startNewEvent();//1
				await this.token.startNewEvent();//2
				await this.token.startNewEvent();//3
				await this.token.startNewEvent();//4
				await this.token.startNewEvent();//5
				await this.token.startNewEvent();//6
				await this.token.startNewEvent();//7
				await this.token.startNewEvent();//8
				await this.token.startNewEvent();//9
				await this.token.startNewEvent();//10
				await this.token.startNewEvent();//11
				await this.token.startNewEvent();//12
				await this.token.startNewEvent();//13
				await this.token.startNewEvent();//14
				await this.token.startNewEvent();//15
				await this.token.startNewEvent();//16
				await this.token.startNewEvent();//17
				await this.token.startNewEvent();//18
				await this.token.startNewEvent();//19
				await this.token.startNewEvent();//20
				await this.token.startNewEvent().should.be.rejectedWith('revert'); //should be revert();
			});

			it('should not be possible to call by non-owner',async() => {
				// TODO:
				this.token = await CopyOnWriteTokenTestable.new();
			});
		});

		describe('getBalanceAtEventStart()', function () {
			it('should preserve balances if no transfers happened after event is started',async() => {
				this.token = await CopyOnWriteTokenTestable.new();
				await this.token.mintFor(employee4, 1);

				let employee4Balance = await this.token.balanceOf(employee4);
				let employee5Balance = await this.token.balanceOf(employee5);

				assert.equal(employee4Balance.toNumber(), 1);
				assert.equal(employee5Balance.toNumber(), 0);

				const tx = await this.token.startNewEvent();
				const events = tx.logs.filter(l => l.event == 'EventStarted');
				const eventID = events.filter(e => e.args._address == creator)[0].args._eventID;

				let employee4EventBalance = await this.token.getBalanceAtEventStart(eventID, employee4);
				let employee5EventBalance = await this.token.getBalanceAtEventStart(eventID, employee5);

				assert.equal(employee4EventBalance.toNumber(), 1);
				assert.equal(employee5EventBalance.toNumber(), 0);
			});

			it('should preserve balances after event is started',async() => {
				this.token = await CopyOnWriteTokenTestable.new();
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewEvent();
				const events = tx.logs.filter(l => l.event == 'EventStarted');
				const eventID = events.filter(e => e.args._address == creator)[0].args._eventID;

				await this.token.transfer(employee5, 1, {from: employee4});

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				employee4EventBalance = await this.token.getBalanceAtEventStart(eventID, employee4);
				employee5EventBalance = await this.token.getBalanceAtEventStart(eventID, employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				assert.equal(employee4EventBalance.toNumber(), 1);
				assert.equal(employee5EventBalance.toNumber(), 0);
			});

			it('should preserve balances after event is started and mintFor called',async() => {
				this.token = await CopyOnWriteTokenTestable.new();

				const tx = await this.token.startNewEvent();
				const events = tx.logs.filter(l => l.event == 'EventStarted');
				const eventID = events.filter(e => e.args._address == creator)[0].args._eventID;

				await this.token.mintFor(employee4, 1);

				employee4Balance = await this.token.balanceOf(employee4);

				employee4EventBalance = await this.token.getBalanceAtEventStart(eventID, employee4);

				assert.equal(employee4Balance.toNumber(), 1);

				assert.equal(employee4EventBalance.toNumber(), 0);
			});

			it('should throw exception when trying to check balancesAtVoting after event is ended',async() => {
				this.token = await CopyOnWriteTokenTestable.new();
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewEvent();
				const events = tx.logs.filter(l => l.event == 'EventStarted');
				const eventID = events.filter(e => e.args._address == creator)[0].args._eventID;

				await this.token.transfer(employee5, 1, {from: employee4});

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				await this.token.finishEvent(eventID);

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				employee4EventBalance = await this.token.getBalanceAtEventStart(eventID, employee4).should.be.rejectedWith('revert');
			});

			it('should preserve balances after event is started and transferFrom is called',async() => {
				this.token = await CopyOnWriteTokenTestable.new();
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewEvent();
				const events = tx.logs.filter(l => l.event == 'EventStarted');
				const eventID = events.filter(e => e.args._address == creator)[0].args._eventID;

				await this.token.approve(employee3, 1, {from: employee4});
				await this.token.transferFrom(employee4, employee5, 1, {from: employee3});

				employee4Balance = await this.token.balanceOf(employee4);
				employee5Balance = await this.token.balanceOf(employee5);

				employee4EventBalance = await this.token.getBalanceAtEventStart(eventID, employee4);
				employee5EventBalance = await this.token.getBalanceAtEventStart(eventID, employee5);

				assert.equal(employee4Balance.toNumber(), 0);
				assert.equal(employee5Balance.toNumber(), 1);

				assert.equal(employee4EventBalance.toNumber(), 1);
				assert.equal(employee5EventBalance.toNumber(), 0);
			});
					 
			it('should throw exception because event is not started yet', async function () {
				this.token = await CopyOnWriteTokenTestable.new();
				await this.token.mintFor(web3.eth.accounts[0], 1000);

				let balance1 = await this.token.getBalanceAtEventStart(0, web3.eth.accounts[0]).should.be.rejectedWith('revert');
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

		describe('finishEvent()', function () {
			it('should not be possible to call by non-owner',async() => {
				// TODO:
				this.token = await CopyOnWriteTokenTestable.new();

			});

			it('should throw revert() if VotingID is wrong',async() => {
				this.token = await CopyOnWriteTokenTestable.new();
				await this.token.mintFor(employee4, 1);

				const tx = await this.token.startNewEvent();
				const events = tx.logs.filter(l => l.event == 'EventStarted');
				const eventID = events.filter(e => e.args._address == creator)[0].args._eventID;

				await this.token.transfer(employee5, 1, {from: employee4});

				employee4EventBalance = await this.token.getBalanceAtEventStart(eventID, employee4);
				employee5EventBalance = await this.token.getBalanceAtEventStart(eventID, employee5);

				assert.equal(employee4EventBalance.toNumber(), 1);
				assert.equal(employee5EventBalance.toNumber(), 0);

				await this.token.finishEvent(75).should.be.rejectedWith('revert');
			});
		});
	})
