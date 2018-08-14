require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();


const DaoStorage = artifacts.require('./DaoStorage');
const StdDaoToken = artifacts.require('./StdDaoToken');
const InformalProposal = artifacts.require('./InformalProposal');
contract('DaoStorage', (accounts) => {
	const creatorAddress = accounts[0];
	const outsider = accounts[1];
	const member = accounts[2];
	const observer = accounts[3];

	let store;
	let token;
	let additionalToken;
	let proposal;

	let tokenIndex = 0;
	let proposalIndex = 0;
	let memberIndex = 0;
	let observerIndex = 0;
	let groupIndex	 = 0;
	const WITHDRAW_DONATIONS = '0xfc685f51f68cb86aa29db19c2a8f4e85183375ba55b5e56fb2e89adc5f5e4285';
	const permissionHash = WITHDRAW_DONATIONS;
	let groupHash = '0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0b';
	let groupHash2 = '0x060990aad7751fab616bf14cf6b68ac4c5cdc555f8f06bc9f15ba1b156e81b0c';
	beforeEach(async () => {
		token = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
		additionalToken = await StdDaoToken.new('StdToken', 'STDT', 18, true, true, 1000000000);
		store = await DaoStorage.new([token.address], { from: creatorAddress });
		let proposalContract = await InformalProposal.new('text');
		proposal = proposalContract.address;
	});

// SETTERS
	describe('test allowActionByShareholder()', ()=> {
		it('should restrict allowActionByShareholder call from outsider', async () => {
			await store.allowActionByShareholder(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call allowActionByShareholder', async () => {
			await store.allowActionByShareholder(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('test allowActionByVoting()', ()=> {
		it('should restrict allowActionByVoting call from outsider', async () => {
			await store.allowActionByVoting(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call allowActionByVoting', async () => {
			await store.allowActionByVoting(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('test allowActionByAddress()', ()=> {
		it('should restrict allowActionByAddress call', async () => {
			await store.allowActionByAddress(permissionHash, creatorAddress, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call allowActionByAddress', async () => {
			await store.allowActionByAddress(permissionHash, creatorAddress).should.be.fulfilled;
		});			
	});

	describe('test allowActionByAnyMemberOfGroup()', ()=> {
		it('should restrict allowActionByAnyMemberOfGroup call', async () => {
			await store.allowActionByAnyMemberOfGroup(permissionHash, groupHash, {from:outsider}).should.be.rejectedWith('revert'); 
		});

		it('should call allowActionByAnyMemberOfGroup', async () => {
			await store.allowActionByAnyMemberOfGroup(permissionHash, groupHash).should.be.fulfilled;
		});
	});

	describe('test addToken()', ()=> {
		it('should restrict addToken call from outsider', async () => {
			await store.addToken(additionalToken.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call addToken', async () => {
			await store.addToken(additionalToken.address).should.be.fulfilled;
		});
	});

	describe('test addProposal()', ()=> {
		it('restrict addProposal call from outsider', async () => {
			await store.addProposal(proposal, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('call addProposal', async () => {
			await store.addProposal(proposal).should.be.fulfilled;
		});
	});

	describe('test addObserver()', ()=> {
		it('should revert while trying to get nonexistent observer', async () => {
			await store.getObserverAtIndex(0).should.be.rejectedWith('revert');
		});

		it('call addObserver', async () => {
			await store.addObserver(observer).should.be.fulfilled;
		});
	});

	describe('test addGroupMember()', ()=> {
		it('restrict addGroupMember call from outsider', async () => {
			await store.addGroupMember(groupHash, member, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should add GroupMember', async () => {
			await store.addGroupMember(groupHash, member).should.be.fulfilled;
		});
	});

// GETTERS
	describe('test isAllowedActionByShareholder()', ()=> {
		it('should accept outsider`s isAllowedActionByShareholder call', async () => {
			await store.isAllowedActionByShareholder(permissionHash, token.address,{from:outsider}).should.be.fulfilled;
		});	

		it('should be allowed', async () => {
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

	describe('test isAllowedActionByVoting()', ()=> {
		it('should accept outsider`s isAllowedActionByVoting call', async () => {
			await store.isAllowedActionByVoting(permissionHash, token.address,{from:outsider}).should.be.fulfilled;
		});	

		it('should be allowed', async () => {
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

	describe('test isAllowedActionByAddress()', ()=> {
		it('should accept outsider`s isAllowedActionByAddress call', async () => {
			await store.isAllowedActionByAddress(permissionHash, creatorAddress,{from:outsider}).should.be.fulfilled;
		});	

		it('should be allowed', async () => {
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

	describe('test isAllowedActionByMembership()', ()=> {
		it('should accept outsider`s isAllowedActionByMembership call', async () => {
			await store.isAllowedActionByMembership(permissionHash, member,{from:outsider}).should.be.fulfilled;
		});	

		it('should be allowed', async () => {
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

	describe('test getTokenAtIndex()', ()=> {
		it('should accept outsider`s getTokenAtIndex call', async () => {
			await store.getTokenAtIndex(0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent token', async () => {
			await store.getTokenAtIndex(1).should.be.rejectedWith('revert');
		});

		it('should get token', async () => {
			await store.addToken(additionalToken.address).should.be.fulfilled;
			let receivedToken = await store.getTokenAtIndex(1);
			assert.equal(receivedToken, additionalToken.address);
		});
	});

	describe('test getProposalAtIndex()', ()=> {
		it('should accept outsider`s getProposalAtIndex call', async () => {
			await store.addProposal(proposal);
			await store.getProposalAtIndex(0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent proposal', async () => {
			await store.getProposalAtIndex(0).should.be.rejectedWith('revert');
		});

		it('should get proposal', async () => {
			await store.addProposal(proposal);
			let receivedProposal = await store.getProposalAtIndex(0);
			assert.equal(receivedProposal, proposal);
		});
	});

	describe('test getObserverAtIndex()', ()=> {
		it('should accept outsider`s getObserverAtIndex call', async () => {
			await store.addObserver(observer);
			await store.getObserverAtIndex(0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent observer', async () => {
			await store.getObserverAtIndex(0).should.be.rejectedWith('revert');
		});

		it('should get observer', async () => {
			await store.addObserver(observer);
			let receivedObserver = await store.getObserverAtIndex(0);
			assert.equal(receivedObserver, observer);
		});
	});

	describe('test getGroupsMemberAtIndex()', ()=> {
		it('should accept outsider`s getGroupsMemberAtIndex call', async () => {
			await store.addGroupMember(groupHash, member);
			await store.getGroupsMemberAtIndex(groupHash, 0,{from:outsider}).should.be.fulfilled;
		});

		it('should revert while trying to get nonexistent groupMember', async () => {
			await store.getGroupsMemberAtIndex(groupHash, 0).should.be.rejectedWith('revert');
		});

		it('should get groupMember', async () => {
			await store.addGroupMember(groupHash, member);
			let groupMember = await store.getGroupsMemberAtIndex(groupHash, 0);
			assert.equal(groupMember, member);
		});
	});	

	describe('test getTokensCount()', ()=> {
		it('should accept outsider`s getTokensCount call', async () => {
			await store.getTokensCount({from:outsider}).should.be.fulfilled;
		});

		it('should get TokensCount', async () => {
			let count = await store.getTokensCount();
			assert.equal(count,1);
		});
	});

	describe('test getProposalsCount()', ()=> {
		it('should accept outsider`s getProposalsCount call', async () => {
			await store.addProposal(proposal);
			await store.getTokensCount({from:outsider}).should.be.fulfilled;
		});

		it('should get proposal count', async () => {
			await store.addProposal(proposal);
			let count = await store.getTokensCount().should.be.fulfilled;
			assert.equal(count,1);		
		});		
	});

	describe('test getObserversCount()', ()=> {
		it('should accept outsider`s getProposalsCount call', async () => {
			await store.addObserver(observer);
			await store.getObserversCount({from:outsider}).should.be.fulfilled;
		});

		it('should get proposal count', async () => {
			await store.addObserver(observer);
			let count = await store.getObserversCount().should.be.fulfilled;
			assert.equal(count,1);		
		});	
	});

	describe('test getAllTokenAddresses()', ()=> {
		it('should accept outsider`s getAllTokenAddresses call', async () => {
			await store.getAllTokenAddresses({from:outsider}).should.be.fulfilled;
		});

		it('should call getAllTokenAddresses', async () => {
			var all = await store.getAllTokenAddresses();
			assert.equal(all.length, 1);
		});
	});

	describe('test getAllProposals()', ()=> {
		it('should accept outsider`s getAllProposals call', async () => {
			await store.getAllProposals({from:outsider}).should.be.fulfilled;
		});

		it('should call getAllProposals', async () => {
			var all = await store.getAllProposals();
			assert.equal(all.length, 0);
			await store.addProposal(proposal);
			var all = await store.getAllProposals();
			assert.equal(all.length, 1);
		});
	});

	describe('test getAllObservers()', ()=> {
		it('should accept outsider`s getAllObservers call', async () => {
			await store.getAllObservers({from:outsider}).should.be.fulfilled;
		});

		it('should call getAllObservers', async () => {
			var all = await store.getAllObservers();
			assert.equal(all.length, 0);
			await store.addObserver(observer);
			var all = await store.getAllObservers();
			assert.equal(all.length, 1);
		});
	});

	describe('test getMembersGroupAtIndex()', ()=> {
		it('should revert while trying to get nonexistent member group', async () => {
			await store.getMembersGroupAtIndex(member, 0).should.be.rejectedWith('revert');
		});		

		it('should accept outsider`s getMembersGroupAtIndex call', async () => {
			await store.addGroupMember(groupHash, member);
			await store.getMembersGroupAtIndex(member, groupIndex, {from:outsider}).should.be.fulfilled;
		});

		it('should call getMembersGroupAtIndex', async () => {
			await store.addGroupMember(groupHash, member);
			let group = await store.getMembersGroupAtIndex(member, 0);
			assert.equal(group, groupHash);
		});
	});

	describe('test getMembersCount()', ()=> {
		it('should accept outsider`s getMembersCount call', async () => {
			await store.addGroupMember(groupHash, creatorAddress);
			await store.getMembersCount(groupHash, {from:outsider}).should.be.fulfilled;
		});

		it('should  get MembersCount', async () => {
			var count = await store.getMembersCount(groupHash);
			assert.equal(count, 0);
			await store.addGroupMember(groupHash, creatorAddress);
			var count = await store.getMembersCount(groupHash);
			assert.equal(count, 1);
		});
	});

	describe('test getMembersGroupCount()', ()=> {
		it('should accept outsider`s getMembersGroupCount call', async () => {
			await store.addGroupMember(groupHash, member);
			await store.getMembersGroupCount(member, {from:outsider}).should.be.fulfilled;
		});

		it('should call getMembersGroupAtIndex', async () => {
			var count = await store.getMembersGroupCount(member);
			assert.equal(count, 0);
			await store.addGroupMember(groupHash, member);
			var count = await store.getMembersGroupCount(member);
			assert.equal(count, 1);
		});
	});

	describe('test getGroupMembers()', ()=> {
		it('should accept outsider`s getGroupMembers call', async () => {
			await store.getGroupMembers(groupHash, {from:outsider}).should.be.fulfilled
		});

		it('should call getGroupMembers', async () => {
			var groupArr = await store.getGroupMembers(groupHash);
			assert.equal(groupArr.length, 0);			
			await store.addGroupMember(groupHash, member);
			var groupArr = await store.getGroupMembers(groupHash);
			assert.equal(groupArr.length, 1);			
		});
	});

	describe('test getMemberGroups()', ()=> {
		it('should accept outsider`s getMemberGroups call', async () => {
			await store.getMemberGroups(member, {from:outsider}).should.be.fulfilled;
		});

		it('should call getMemberGroups', async () => {
			var groupArr = await store.getMemberGroups(member);
			assert.equal(groupArr.length, 0);			
			await store.addGroupMember(groupHash, member);
			var groupArr = await store.getMemberGroups(member);
			assert.equal(groupArr.length, 1);
		});
	});

	describe('test isGroupMember()', ()=> {
		it('should accept outsider`s isGroupMember call', async () => {
			await store.isGroupMember(groupHash, member, {from:outsider}) 
		});

		it('should call isGroupMember', async () => {
			var isMember = await store.isGroupMember(groupHash, member);
			assert.isFalse(isMember);
			await store.addGroupMember(groupHash, member);
			var isMember = await store.isGroupMember(groupHash, member);
			assert.isTrue(isMember);
		});
	});

// REMOVE
	describe('test restrictActionByShareholder()', ()=> {
		it('should restrict restrictActionByShareholder call from outsider', async () => {
			await store.allowActionByShareholder(permissionHash, token.address);
			await store.restrictActionByShareholder(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call restrict ActionByShareholder', async () => {
			await store.allowActionByShareholder(permissionHash, token.address);
			await store.restrictActionByShareholder(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('test restrictActionByVoting()', ()=> {
		it('should restrictActionByShareholder call from outsider', async () => {
			await store.allowActionByVoting(permissionHash, token.address);
			await store.restrictActionByVoting(permissionHash, token.address, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call restrict ActionByShareholder', async () => {
			await store.allowActionByVoting(permissionHash, token.address);
			await store.restrictActionByVoting(permissionHash, token.address).should.be.fulfilled;
		});
	});

	describe('test restrictActionByAddress()', ()=> {
		it('should restrict restrictActionByShareholder call from outsider', async () => {
			await store.allowActionByShareholder(permissionHash, creatorAddress);
			await store.restrictActionByShareholder(permissionHash, creatorAddress, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call restrict ActionByShareholder', async () => {
			await store.allowActionByShareholder(permissionHash, creatorAddress);
			await store.restrictActionByShareholder(permissionHash, creatorAddress).should.be.fulfilled;
		});
	});

	describe('test restrictActionByGroupMembership()', ()=> {
		it('should restrict restrictActionByShareholder call from outsider', async () => {
			await store.allowActionByAnyMemberOfGroup(groupHash, permissionHash);
			await store.restrictActionByGroupMembership(groupHash, permissionHash, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should call restrict ActionByShareholder', async () => {
			await store.allowActionByAnyMemberOfGroup(groupHash, permissionHash);
			await store.restrictActionByGroupMembership(groupHash, permissionHash).should.be.fulfilled;
		});
	});

	describe('test removeGroupMember()', ()=> {
		it('should restrict removeGroupMember call from outsider', async () => {
			await store.addGroupMember(groupHash, member);
			await store.removeGroupMember(groupHash, member, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should restrict removeGroupMember if not exist', async () => {
			await store.removeGroupMember(groupHash, member).should.be.rejectedWith('revert');
		});

		it('should call removeGroupMember', async () => {
			await store.addGroupMember(groupHash, member);
			await store.removeGroupMember(groupHash, member).should.be.fulfilled;
		});
	});

	describe('test removeProposal()', ()=> {
		it('should restrict removeProposal call from outsider', async () => {
			await store.addProposal(proposal);
			await store.removeProposal(proposal, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should restrict removeProposal if not exist', async () => {
			await store.removeProposal(proposal).should.be.rejectedWith('revert');
		});

		it('should call removeProposal', async () => {
			await store.addProposal(proposal);
			await store.removeProposal(proposal).should.be.fulfilled;
		});
	});

	describe('test removeObserver()', ()=> {
		it('should restrict removeObserver call from outsider', async () => {
			await store.addObserver(observer);
			await store.removeObserver(observer, {from:outsider}).should.be.rejectedWith('revert');
		});

		it('should restrict removeObserver if not exist', async () => {
			await store.removeObserver(observer).should.be.rejectedWith('revert');
		});

		it('should call removeObserver', async () => {
			await store.addObserver(observer);
			await store.removeObserver(observer).should.be.fulfilled;
		});
	});
});