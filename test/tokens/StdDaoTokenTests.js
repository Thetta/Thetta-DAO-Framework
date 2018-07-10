const BigNumber = web3.BigNumber;

const StdDaoToken = artifacts.require('StdDaoToken');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	.should();

	contract('StdDaoToken', (accounts) => {
		
		const creator = accounts[0];
		
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

		it('should fail due to finishMinting() not owner call', async function () {
			this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, 100);
			await this.token.finishMinting({from: web3.eth.accounts[1]}).should.be.rejectedWith('revert');
		});

		it('should fail due to finishMinting() call', async function () {
			this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, 100);
			await this.token.finishMinting();
			await this.token.mintFor(web3.eth.accounts[1], 1000).should.be.rejectedWith('revert');
		});
		     
		it('should pass', async function () {
			this.token = await StdDaoToken.new("StdToken","STDT",18, true, false, ETH);
			await this.token.mintFor(web3.eth.accounts[0], 1000);
			this.token.balanceOf(web3.eth.accounts[0]).then(result => {
				assert.equal(result.toNumber(), 1000);
			});
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
			this.token.balanceOf(web3.eth.accounts[0]).then(result => {
				assert.equal(result.toNumber(), 0);
			});
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
	})
