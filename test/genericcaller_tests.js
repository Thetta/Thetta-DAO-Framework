var DaoBaseWithUnpackers = artifacts.require("./DaoBaseWithUnpackers");
var StdDaoToken = artifacts.require("./StdDaoToken");
var DaoStorage = artifacts.require("./DaoStorage");
var WeiFund = artifacts.require("./WeiFund");
var MoneyFlow = artifacts.require("./MoneyFlow");
var IWeiReceiver = artifacts.require("./IWeiReceiver");

var AutoDaoBaseActionCaller = artifacts.require("./AutoDaoBaseActionCaller");
var AutoMoneyflowActionCaller = artifacts.require("./AutoMoneyflowActionCaller");
var DefaultMoneyflowSchemeWithUnpackers = artifacts.require("./DefaultMoneyflowSchemeWithUnpackers");
var DefaultMoneyflowScheme = artifacts.require("./DefaultMoneyflowScheme");

var Voting = artifacts.require("./Voting");
var IProposal = artifacts.require("./IProposal");

var CheckExceptions = require('./utils/checkexceptions');

global.contract('GenericCaller', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const employee3 = accounts[3];
	const outsider = accounts[4];
	const output = accounts[5]; 

	let money = web3.toWei(0.001, "ether");

	global.beforeEach(async() => {

	});
	
	global.it('should not automatically create proposal because AAC has no rights',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		let mcInstance = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let aacInstance = await AutoDaoBaseActionCaller.new(mcInstance.address, {from: creator});

		{
			// add creator as first employee	
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

			await store.allowActionByVoting("manageGroups", token.address);
			await store.allowActionByVoting("issueTokens", token.address);

			// THIS IS REQUIRED because issueTokensAuto() will add new proposal (voting)
			// because of this AAC can't add new proposal!
			// 
			//await store.allowActionByAddress("addNewProposal", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		const proposalsCount1 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount1,0,'No proposals should be added');

		// add new employee1
		await mcInstance.addGroupMember("Employees",employee1,{from: creator});
		const isEmployeeAdded = await mcInstance.isGroupMember("Employees", employee1);
		global.assert.strictEqual(isEmployeeAdded,true,'employee1 should be added as the company`s employee');

		// new proposal should NOT be added 
		await CheckExceptions.checkContractThrows(aacInstance.issueTokensAuto.sendTransaction,
			[employee1,1000,{ from: employee1}],
			'Should not be able to issue tokens AND add new proposal');

		const proposalsCount2 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount2,0,'No new proposal should be added because'); 
	});

	global.it('should not issue tokens automatically because issueTokens cant be called even with voting',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		let mcInstance = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let aacInstance = await AutoDaoBaseActionCaller.new(mcInstance.address, {from: creator});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			// manually setup the Default organization 
			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

			// this is a list of actions that require voting
			await store.allowActionByVoting("manageGroups", token.address);

			// SEE this -> this permissions is commented! So even if AAC has rights to add proposal, 
			// the proposal will never be finished 
			// 
			//await store.allowActionByVoting("issueTokens", token.address);

			// THIS IS REQUIRED because issueTokensAuto() will add new proposal (voting)
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("manageGroups", aacInstance.address);
			await store.allowActionByAddress("issueTokens", aacInstance.address);
			await store.allowActionByAddress("upgradeDaoContract", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		// even creator cant issue token directly!
		await CheckExceptions.checkContractThrows(mcInstance.issueTokens.sendTransaction,
			[employee1, 1500 ,{ from: creator}],
			'Even creator cant issue tokens');

		const proposalsCount1 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount1,0,'No proposals should be added');

		// add new employee1
		await mcInstance.addGroupMember("Employees",employee1,{from: creator});
		const isEmployeeAdded = await mcInstance.isGroupMember("Employees",employee1);
		global.assert.strictEqual(isEmployeeAdded,true,'employee1 should be added as the company`s employee');

		// employee1 is NOT in the majority
		const isCanDo1 = await mcInstance.isCanDoAction(employee1,"issueTokens");
		global.assert.strictEqual(isCanDo1,false,'employee1 is NOT in the majority, so can issue token only with voting');
		const isCanDo2 = await mcInstance.isCanDoAction(employee1,"addNewProposal");
		global.assert.strictEqual(isCanDo2,true,'employee1 can add new vote');

		// new proposal should be added 
		await aacInstance.issueTokensAuto(employee1,1000,{from: employee1});
		const proposalsCount2 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount2,1,'New proposal should be added'); 

		// check the voting data
		const pa = await mcInstance.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		// should not vote! because ACTION will throw 
		// i.e. 'issueTokens' action is disabled!
		//
		await voting.vote(true,0,{from:employee1});

		// TODO: uncomment! this condition should be met 
		
		// await CheckExceptions.checkContractThrows(voting.vote.sendTransaction,
		// 	[true,{ from: employee1}],
		// 	'issueTokens is not allowed!');

		const r2 = await voting.getFinalResults();
		global.assert.equal(r2[0],2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1],0,'no');
		global.assert.equal(r2[2],2,'total');

		// get voting results again
		global.assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');
		
		const balance2 = await token.balanceOf(employee1);
		global.assert.notEqual(balance2.toNumber(),1000,'employee1 balance should NOT be updated');
	});

	global.it('should automatically create proposal and voting to issue more tokens',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		let mcInstance = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let aacInstance = await AutoDaoBaseActionCaller.new(mcInstance.address, {from: creator});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);

			// manually setup the Default organization 
			await store.allowActionByAnyMemberOfGroup("addNewProposal","Employees");

			// this is a list of actions that require voting
			await store.allowActionByVoting("manageGroups", token.address);
			await store.allowActionByVoting("issueTokens", token.address);

			// THIS IS REQUIRED because issueTokensAuto() will add new proposal (voting)
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("manageGroups", aacInstance.address);
			await store.allowActionByAddress("issueTokens", aacInstance.address);
			await store.allowActionByAddress("upgradeDaoContract", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		const proposalsCount1 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount1,0,'No proposals should be added');

		// add new employee1
		await mcInstance.addGroupMember("Employees",employee1,{from: creator});
		const isEmployeeAdded = await mcInstance.isGroupMember("Employees",employee1);
		global.assert.strictEqual(isEmployeeAdded,true,'employee1 should be added as the company`s employee');

		// employee1 is NOT in the majority
		const isCanDo1 = await mcInstance.isCanDoAction(employee1,"issueTokens");
		global.assert.strictEqual(isCanDo1,false,'employee1 is NOT in the majority, so can issue token only with voting');
		const isCanDo2 = await mcInstance.isCanDoAction(employee1,"addNewProposal");
		global.assert.strictEqual(isCanDo2,true,'employee1 can add new vote');

		// new proposal should be added 
		await aacInstance.issueTokensAuto(employee1,1000,{from: employee1});
		const proposalsCount2 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount2,1,'New proposal should be added'); 

		// check the voting data
		const pa = await mcInstance.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		const r = await voting.getFinalResults();
		global.assert.equal(r[0],1,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r[1],0,'no');
		global.assert.equal(r[2],1,'total');

		const balance1 = await token.balanceOf(employee1);
		global.assert.strictEqual(balance1.toNumber(),0,'initial employee1 balance');

		// vote again
		// should execute the action (issue tokens)!
		await voting.vote(true,0,{from:employee1});
		const r2 = await voting.getFinalResults();
		global.assert.equal(r2[0],2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1],0,'no');
		global.assert.equal(r2[2],2,'total');

		// get voting results again
		global.assert.strictEqual(await voting.isFinished(),true,'Voting is finished now');
		global.assert.strictEqual(await voting.isYes(),true,'Voting result is yes!');

		const balance2 = await token.balanceOf(employee1);
		global.assert.strictEqual(balance2.toNumber(),1000,'employee1 balance should be updated');

		// should not call vote again 
		await CheckExceptions.checkContractThrows(voting.vote.sendTransaction,
			[true,{ from: creator}],
			'Should not call action again');
	});

	global.it('should be able to upgrade with AAC',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 500);
		await token.mint(employee1, 500);
		await token.mint(employee2, 500);
		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});

		let mcInstance = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let aacInstance = await AutoDaoBaseActionCaller.new(mcInstance.address, {from: creator});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);
			await store.addGroupMember("Employees", employee1);
			await store.addGroupMember("Employees", employee2);

			//await store.allowActionByAnyMemberOfGroup("manageGroups","Employees");

			await store.allowActionByVoting("upgradeDao", token.address);

			// THIS IS REQUIRED because issueTokensAuto() will add new proposal (voting)
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("manageGroups", aacInstance.address);
			await store.allowActionByAddress("addNewTask", aacInstance.address);
			await store.allowActionByAddress("issueTokens", aacInstance.address);
			await store.allowActionByAddress("upgradeDaoContract", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		// should be able to upgrde microcompany directly without voting (creator is in majority!)
		let mcInstanceNew = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		await aacInstance.upgradeDaoContractAuto(mcInstanceNew.address,{from: employee1});

		const pa = await mcInstance.getProposalAtIndex(0);
		const proposal = await IProposal.at(pa);
		const votingAddress = await proposal.getVoting();
		const voting = await Voting.at(votingAddress);
		global.assert.strictEqual(await voting.isFinished(),false,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),false,'Voting is still not finished');

		await voting.vote(true,0,{from:creator});
		
		const r2 = await voting.getFinalResults();
		global.assert.equal(r2[0].toNumber(),2,'yes');			// 1 already voted (who started the voting)
		global.assert.equal(r2[1].toNumber(),0,'no');
		global.assert.equal(r2[2].toNumber(),2,'total');

		// get voting results again
		global.assert.strictEqual(await voting.isFinished(),true,'Voting is still not finished');
		global.assert.strictEqual(await voting.isYes(),true,'Voting is still not finished');
	});

	global.it('should allow to get donations using AAC (direct call)',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);

		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});
		let mcInstance = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let moneyflowInstance = await MoneyFlow.new(mcInstance.address, {from: creator});

		let aacInstance = await AutoMoneyflowActionCaller.new(mcInstance.address, moneyflowInstance.address, {from: creator, gas: 10000000});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);
			await store.addGroupMember("Employees", employee1);
			await store.addGroupMember("Employees", employee2);

			await store.allowActionByAddress("manageGroups", creator);

			await store.allowActionByAnyMemberOfGroup("addNewEmployee","Employees");
			await store.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

			await store.allowActionByVoting("withdrawDonations", token.address);

			// AAC requires special permissions
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("withdrawDonations", aacInstance.address);
			await store.allowActionByAddress("addNewTask", aacInstance.address);
			await store.allowActionByAddress("setRootWeiReceiver", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		// check permissions
		const isCanWithdraw = await mcInstance.isCanDoAction(creator,"withdrawDonations");
		global.assert.equal(isCanWithdraw, true, 'Creator should be able to withdrawDonations directly without voting');

		// send some money
		const dea = await moneyflowInstance.getDonationEndpoint(); 
		global.assert.notEqual(dea,0x0, 'donation endpoint should be created');
		const donationEndpoint = await IWeiReceiver.at(dea);
		await donationEndpoint.processFunds(money, { from: creator, value: money});

		let donationBalance = await web3.eth.getBalance(donationEndpoint.address);
		global.assert.equal(donationBalance.toNumber(),money, 'all money at donation point now');

		// get the donations 
		let pointBalance = await web3.eth.getBalance(output);
		// this will call the action directly!
		await aacInstance.withdrawDonationsToAuto(output, {from:creator, gas:100000});
		const proposalsCount1 = await mcInstance.getProposalsCount();
		global.assert.equal(proposalsCount1,0,'No proposals should be added');

		let pointBalance2 = await web3.eth.getBalance(output);
		const receiverDelta = pointBalance2.toNumber() - pointBalance.toNumber();

		global.assert.notEqual(receiverDelta, 0, 'Donations should be withdrawn');
	});

	global.it('should allow to get donations using AAC (with voting)',async() => {
		let token = await StdDaoToken.new("StdToken","STDT",18,{from: creator});
		await token.mint(creator, 1000);

		let store = await DaoStorage.new(token.address,{gas: 10000000, from: creator});
		let mcInstance = await DaoBaseWithUnpackers.new(store.address,{gas: 10000000, from: creator});
		let moneyflowInstance = await MoneyFlow.new(mcInstance.address, {from: creator});

		let aacInstance = await AutoMoneyflowActionCaller.new(mcInstance.address, moneyflowInstance.address, {from: creator, gas: 10000000});

		{
			await store.addGroup("Employees");
			await store.addGroupMember("Employees", creator);
			await store.addGroupMember("Employees", employee1);
			await store.addGroupMember("Employees", employee2);

			await store.allowActionByAddress("manageGroups", creator);

			await store.allowActionByAnyMemberOfGroup("addNewEmployee","Employees");
			await store.allowActionByAnyMemberOfGroup("modifyMoneyscheme","Employees");

			await store.allowActionByVoting("withdrawDonations", token.address);

			// AAC requires special permissions
			await store.allowActionByAddress("addNewProposal", aacInstance.address);
			// these actions required if AAC will call this actions DIRECTLY (without voting)
			await store.allowActionByAddress("withdrawDonations", aacInstance.address);
			await store.allowActionByAddress("addNewTask", aacInstance.address);
			await store.allowActionByAddress("setRootWeiReceiver", aacInstance.address);
		}

		// do not forget to transfer ownership
		await token.transferOwnership(mcInstance.address);
		await store.transferOwnership(mcInstance.address);

		// TODO: implement test 
	});
});


