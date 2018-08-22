const DaoStorage = artifacts.require('./DaoStorage');
const StdDaoToken = artifacts.require('./StdDaoToken');
const InformalProposal = artifacts.require('./InformalProposal');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('DaoStorage', (accounts) => {
	const creatorAddress = accounts[0];
	const outsider = accounts[1];
	const member = accounts[2];
	const observer = accounts[3];

	let store;
	let token;
	let additionalToken;
	let proposal;

	const WITHDRAW_DONATIONS = '0xfc685f51f68cb86aa29db19c2a8f4e85183375ba55b5e56fb2e89adc5f5e4285';
	const permissionHash = WITHDRAW_DONATIONS;
	let groupHash = '0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0b';
	let groupHash2 = '0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0c';
	beforeEach(async () => {
		token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
		additionalToken = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
		store = await DaoStorage.new([token.address], { from: creatorAddress });
	});

// SETTERS
	describe('allowActionByShareholder()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.allowActionByShareholder(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByShareholder(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('allowActionByVoting()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.allowActionByVoting(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByVoting(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('allowActionByAddress()', ()=> {
		it('should restrict allowActionByAddress call', async () => {
			await store.allowActionByAddress(permissionHash, creatorAddress, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByAddress(permissionHash, creatorAddress).should.be.fulfilled;
		});			
	});

	describe('allowActionByAnyMemberOfGroup()', ()=> {
		it('should restrict allowActionByAnyMemberOfGroup call', async () => {
			await store.allowActionByAnyMemberOfGroup(permissionHash, groupHash, {from:outsider}).should.be.rejectedWith('revert'); 
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByAnyMemberOfGroup(permissionHash, groupHash).should.be.fulfilled;
		});
	});

	describe('addToken()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addToken(additionalToken.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addToken(additionalToken.address).should.be.fulfilled;
		});
	});

	describe('addProposal()', ()=> {
		it('should fail if called by a person without permission', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;
			await store.addProposal(proposal, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;			
			await store.addProposal(proposal).should.be.fulfilled;
		});
	});

	describe('addObserver()', ()=> {
		it('should revert while trying to get nonexistent observer', async () => {
			await store.getObserverAtIndex(0).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addObserver(observer).should.be.fulfilled;
		});
	});

	describe('addGroupMember()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addGroupMember(groupHash, member, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addGroupMember(groupHash, member).should.be.fulfilled;
		});
	});

// GETTERS
	describe('isAllowedActionByShareholder()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.isAllowedActionByShareholder(permissionHash, token.address,{from:outsider}).should.be.fulfilled;
		});	

		it('should succeed if called by a person that has correct permission set', async () => {
			var isAllowed = await store.isAllowedActionByShareholder(permissionHash, token.address);
			assert.isFalse(isAllowed);
			await store.allowActionByShareholder(permissionHash, token.address);
			var isAllowed = await store.isAllowedActionByShareholder(permissionHash, token.address);
			assert.isTrue(isAllowed);
			await store.restrictActionByShareholder(permissionHash, token.address);
			var isAllowed = await store.isAllowedActionByShareholder(permissionHash, token.address);
			assert.isFalse(isAllowed);
		});
	});

	describe('isAllowedActionByVoting()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.isAllowedActionByVoting(permissionHash, token.address,{from:outsider}).should.be.fulfilled;
		});	

		it('should succeed if called by a person that has correct permission set', async () => {
			var isAllowed = await store.isAllowedActionByVoting(permissionHash, token.address);
			assert.isFalse(isAllowed);
			await store.allowActionByVoting(permissionHash, token.address);
			var isAllowed = await store.isAllowedActionByVoting(permissionHash, token.address);
			assert.isTrue(isAllowed);
			await store.restrictActionByVoting(permissionHash, token.address);
			var isAllowed = await store.isAllowedActionByVoting(permissionHash, token.address);
			assert.isFalse(isAllowed);
		});
	});

	describe('isAllowedActionByAddress()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.isAllowedActionByAddress(permissionHash, creatorAddress,{from:outsider}).should.be.fulfilled;
		});	

		it('should succeed if called by a person that has correct permission set', async () => {
			var isAllowed = await store.isAllowedActionByAddress(permissionHash, creatorAddress);
			assert.isFalse(isAllowed);
			await store.allowActionByAddress(permissionHash, creatorAddress);
			var isAllowed = await store.isAllowedActionByAddress(permissionHash, creatorAddress);
			assert.isTrue(isAllowed);
			await store.restrictActionByAddress(permissionHash, creatorAddress);
			var isAllowed = await store.isAllowedActionByAddress(permissionHash, creatorAddress);
			assert.isFalse(isAllowed);
		});		
	});

	describe('isAllowedActionByMembership()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.isAllowedActionByMembership(permissionHash, member,{from:outsider}).should.be.fulfilled;
		});	

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addGroupMember(groupHash, member);
			var isAllowed = await store.isAllowedActionByMembership(permissionHash, member);
			assert.isFalse(isAllowed);
			await store.allowActionByAnyMemberOfGroup(permissionHash, groupHash);
			var isAllowed = await store.isAllowedActionByMembership(permissionHash, member);
			assert.isTrue(isAllowed);
			await store.restrictActionByGroupMembership(permissionHash, groupHash);
			var isAllowed = await store.isAllowedActionByMembership(permissionHash, member);
			assert.isFalse(isAllowed);
		});	
	});

	describe('getTokenAtIndex()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getTokenAtIndex(0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent token', async () => {
			await store.getTokenAtIndex(1).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addToken(additionalToken.address).should.be.fulfilled;
			let receivedToken = await store.getTokenAtIndex(1);
			assert.equal(receivedToken, additionalToken.address);
		});
	});

	describe('getProposalAtIndex()', ()=> {
		it('should fail if called by a person without permission', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.addProposal(proposal);
			await store.getProposalAtIndex(0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent proposal', async () => {
			await store.getProposalAtIndex(0).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.addProposal(proposal);
			let receivedProposal = await store.getProposalAtIndex(0);
			assert.equal(receivedProposal, proposal);
		});
	});

	describe('getObserverAtIndex()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addObserver(observer);
			await store.getObserverAtIndex(0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent observer', async () => {
			await store.getObserverAtIndex(0).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addObserver(observer);
			let receivedObserver = await store.getObserverAtIndex(0);
			assert.equal(receivedObserver, observer);
		});
	});

	describe('getGroupsMemberAtIndex()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addGroupMember(groupHash, member);
			await store.getGroupsMemberAtIndex(groupHash, 0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent groupMember', async () => {
			await store.getGroupsMemberAtIndex(groupHash, 0).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addGroupMember(groupHash, member);
			let groupMember = await store.getGroupsMemberAtIndex(groupHash, 0);
			assert.equal(groupMember, member);
		});
	});	

	describe('getTokensCount()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getTokensCount({from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			let count = await store.getTokensCount();
			assert.equal(count,1);
		});
	});

	describe('getProposalsCount()', ()=> {
		it('should fail if called by a person without permission', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.addProposal(proposal);
			await store.getTokensCount({from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set count', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.addProposal(proposal);
			let count = await store.getTokensCount().should.be.fulfilled;
			assert.equal(count,1);		
		});		
	});

	describe('getObserversCount()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addObserver(observer);
			await store.getObserversCount({from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set count', async () => {
			await store.addObserver(observer);
			let count = await store.getObserversCount().should.be.fulfilled;
			assert.equal(count,1);		
		});	
	});

	describe('getAllTokenAddresses()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getAllTokenAddresses({from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var all = await store.getAllTokenAddresses();
			assert.equal(all.length, 1);
		});
	});

	describe('getAllProposals()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getAllProposals({from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			var all = await store.getAllProposals();
			assert.equal(all.length, 0);
			await store.addProposal(proposal);
			var all = await store.getAllProposals();
			assert.equal(all.length, 1);
		});
	});

	describe('getAllObservers()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getAllObservers({from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var all = await store.getAllObservers();
			assert.equal(all.length, 0);
			await store.addObserver(observer);
			var all = await store.getAllObservers();
			assert.equal(all.length, 1);
		});
	});

	describe('getMembersGroupAtIndex()', ()=> {
		it('should revert while trying to get nonexistent member group', async () => {
			await store.getMembersGroupAtIndex(member, 0).should.be.rejectedWith('revert');
		});		

		it('should fail if called by a person without permission', async () => {
			await store.addGroupMember(groupHash, member);
			await store.getMembersGroupAtIndex(member, 0, {from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addGroupMember(groupHash, member);
			let group = await store.getMembersGroupAtIndex(member, 0);
			assert.equal(group, groupHash);
		});
	});

	describe('getMembersCount()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addGroupMember(groupHash, creatorAddress);
			await store.getMembersCount(groupHash, {from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var count = await store.getMembersCount(groupHash);
			assert.equal(count, 0);
			await store.addGroupMember(groupHash, creatorAddress);
			var count = await store.getMembersCount(groupHash);
			assert.equal(count, 1);
		});
	});

	describe('getMembersGroupCount()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addGroupMember(groupHash, member);
			await store.getMembersGroupCount(member, {from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var count = await store.getMembersGroupCount(member);
			assert.equal(count, 0);
			await store.addGroupMember(groupHash, member);
			var count = await store.getMembersGroupCount(member);
			assert.equal(count, 1);
		});
	});

	describe('getGroupMembers()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getGroupMembers(groupHash, {from:outsider}).should.be.fulfilled
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var groupArr = await store.getGroupMembers(groupHash);
			assert.equal(groupArr.length, 0);			
			await store.addGroupMember(groupHash, member);
			var groupArr = await store.getGroupMembers(groupHash);
			assert.equal(groupArr.length, 1);			
		});
	});

	describe('getMemberGroups()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.getMemberGroups(member, {from:outsider}).should.be.fulfilled;
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var groupArr = await store.getMemberGroups(member);
			assert.equal(groupArr.length, 0);			
			await store.addGroupMember(groupHash, member);
			var groupArr = await store.getMemberGroups(member);
			assert.equal(groupArr.length, 1);
		});
	});

	describe('isGroupMember()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.isGroupMember(groupHash, member, {from:outsider}) 
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			var isMember = await store.isGroupMember(groupHash, member);
			assert.isFalse(isMember);
			await store.addGroupMember(groupHash, member);
			var isMember = await store.isGroupMember(groupHash, member);
			assert.isTrue(isMember);
		});
	});

// REMOVE
	describe('restrictActionByShareholder()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.allowActionByShareholder(permissionHash, token.address);
			await store.restrictActionByShareholder(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByShareholder(permissionHash, token.address);
			await store.restrictActionByShareholder(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('restrictActionByVoting()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.allowActionByVoting(permissionHash, token.address);
			await store.restrictActionByVoting(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByVoting(permissionHash, token.address);
			await store.restrictActionByVoting(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('restrictActionByAddress()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.allowActionByShareholder(permissionHash, creatorAddress);
			await store.restrictActionByShareholder(permissionHash, creatorAddress, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByShareholder(permissionHash, creatorAddress);
			await store.restrictActionByShareholder(permissionHash, creatorAddress).should.be.fulfilled;
		});
	});

	describe('restrictActionByGroupMembership()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.allowActionByAnyMemberOfGroup(groupHash, permissionHash);
			await store.restrictActionByGroupMembership(groupHash, permissionHash, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.allowActionByAnyMemberOfGroup(groupHash, permissionHash);
			await store.restrictActionByGroupMembership(groupHash, permissionHash).should.be.fulfilled;
		});
	});

	describe('removeGroupMember()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addGroupMember(groupHash, member);
			await store.removeGroupMember(groupHash, member, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should restrict if not exist', async () => {
			await store.removeGroupMember(groupHash, member).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addGroupMember(groupHash, member);
			await store.removeGroupMember(groupHash, member).should.be.fulfilled;
		});
	});

	describe('removeProposal()', ()=> {
		it('should fail if called by a person without permission', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.addProposal(proposal);
			await store.removeProposal(proposal, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should restrict if not exist', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.removeProposal(proposal).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			let proposalContract = await InformalProposal.new('text');
			proposal = proposalContract.address;				
			await store.addProposal(proposal);
			await store.removeProposal(proposal).should.be.fulfilled;
		});
	});

	describe('removeObserver()', ()=> {
		it('should fail if called by a person without permission', async () => {
			await store.addObserver(observer);
			await store.removeObserver(observer, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should restrict if not exist', async () => {
			await store.removeObserver(observer).should.be.rejectedWith('revert');
		});

		it('should succeed if called by a person that has correct permission set', async () => {
			await store.addObserver(observer);
			await store.removeObserver(observer).should.be.fulfilled;
		});
	});
});