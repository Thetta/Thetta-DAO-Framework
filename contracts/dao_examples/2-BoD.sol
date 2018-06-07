pragma solidity ^0.4.22;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

import '../DaoBaseAuto.sol';

// 
/*
contract DaoWithBoD_Factory {
	DaoBaseWithUnpackers public daoBase;

	StdDaoToken token;
	DaoStorage store;
	
	function DaoWithBoD_Factory(address _creator, address[] _bod, address[] _employees)public{
		createDao(_creator, _bod, _employees);
	}

	function createDao(address _creator, address[] _bod, address[] _employees) internal returns(address) {
		// 1 - create
	   token = new StdDaoToken("StdToken", "STDT", 18);
		store = new DaoStorage(token);
		daoBase = new DaoBaseWithUnpackers(store);

		store.allowActionByAddress(keccak256("manageGroups"),this);

		token.transferOwnership(daoBase);
		store.transferOwnership(daoBase);

		// 2 - setup
		setPermissions(_creator, _bod, _employees);

		// 3 - return 
		daoBase.transferOwnership(msg.sender);
		return daoBase;
	}

	function setPermissions(address _creator, address[] _bod, address[] _employees) internal {
		daoBase.addGroup("BoD");
		daoBase.addGroup("Employees");

		// 1 - creator is in BoD initially
		daoBase.addGroupMember("BoD", _creator);
		daoBase.addGroupMember("Employees", _creator);

		// 2 - set BoD group permissions
		daoBase.allowActionByAnyMemberOfGroup("addNewProposal","BoD");

		// 3 - set Employees group permissions 
		daoBase.allowActionByAnyMemberOfGroup("startTask","Employees");
		daoBase.allowActionByAnyMemberOfGroup("startBounty","Employees");

		// 4 - the rest is by voting only (requires addNewProposal permission)
		daoBase.allowActionByVoting("manageGroups", token);
		daoBase.allowActionByVoting("addNewTask", token);
		daoBase.allowActionByVoting("modifyMoneyscheme", token);
		daoBase.allowActionByVoting("issueTokens", token);
		daoBase.allowActionByVoting("upgradeDaoContract", token);
		daoBase.allowActionByVoting("withdrawDonations", token);
		daoBase.allowActionByVoting("flushReserveFundTo", token);
		daoBase.allowActionByVoting("flushDividendsFundTo", token);

		// 5 - populate groups
		uint i = 0;
		for(i=0; i<_bod.length; ++i){
			daoBase.addGroupMember("BoD", _bod[i]);
		}

		for(i=0; i<_employees.length; ++i){
			daoBase.addGroupMember("Employees", _employees[i]);
		}
	}

	// WARNING:
	// Unfortunately creating AutoDaoBaseActionCaller here caused some weird bug 
	// with OutOfGas...That's why i moved AutoDaoBaseActionCaller creation outside of this contract
	function setupAac(AutoDaoBaseActionCaller _aac) public {
		uint VOTING_TYPE_1P1V = 1;
		_aac.setVotingParams("manageGroups", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("addNewTask", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("modifyMoneyscheme", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("issueTokens", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("upgradeDaoContract", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("withdrawDonations", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("flushReserveFundTo", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		_aac.setVotingParams("flushDividendsFundTo", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);

		daoBase.allowActionByAddress("manageGroups", _aac);
		daoBase.allowActionByAddress("addNewProposal", _aac);
		daoBase.allowActionByAddress("modifyMoneyscheme", _aac);

		_aac.transferOwnership(msg.sender);
	}
}
*/

