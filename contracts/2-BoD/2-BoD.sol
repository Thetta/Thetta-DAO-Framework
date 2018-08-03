pragma solidity ^0.4.22;

import "../DaoBase.sol";
import "../DaoBaseAuto.sol";
import "../tokens/StdDaoToken.sol";
import "../tasks/Tasks.sol";

contract BodDaoFactory {

	DaoStorage public store;
	DaoBaseWithUnpackers public daoBase;
	DaoBaseAuto public aac;
	StdDaoToken public token;

	address[] tokens;

	constructor(address _creator, address[] _directors, address[] _employees) public {
		createDao(_creator, _directors, _employees);
		// setupAac();
	}

	function createDao(address _creator, address[] _directors, address[] _employees) internal returns (address) {

		// 1 - create
		token = new StdDaoToken("StdToken", "STDT", 18, true, true, 1e9);
		tokens.push(address(token));
		store = new DaoStorage(tokens);
		daoBase = new DaoBaseWithUnpackers(store);

		store.allowActionByAddress(keccak256("manageGroups"), this);

		token.transferOwnership(daoBase);
		store.transferOwnership(daoBase);

		// 2 - setup
		setPermissions(_creator, _directors, _employees);

		// 3 - return 
		daoBase.transferOwnership(msg.sender);
		return daoBase;
	}

	function setPermissions(address _creator, address[] _directors, address[] _employees) internal {

		// 1 - creator is in BoD initially
		daoBase.addGroupMember("BoD", _creator);
		daoBase.addGroupMember("Employees", _creator);

		// 2 - set BoD group permissions
		daoBase.allowActionByAnyMemberOfGroup(keccak256("addNewProposal"), "BoD");

		// 3 - set Employees group permissions 
		daoBase.allowActionByAnyMemberOfGroup(keccak256("startTask"), "Employees");
		daoBase.allowActionByAnyMemberOfGroup(keccak256("startBounty"), "Employees");

		// 4 - the rest is by voting only (requires addNewProposal permission)
		daoBase.allowActionByVoting(keccak256("manageGroups"), token);
		daoBase.allowActionByVoting(keccak256("addNewTask"), token);
		daoBase.allowActionByVoting(keccak256("modifyMoneyscheme"), token);
		daoBase.allowActionByVoting(keccak256("issueTokens"), token);
		daoBase.allowActionByVoting(keccak256("upgradeDaoContract"), token);
		daoBase.allowActionByVoting(keccak256("withdrawDonations"), token);
		daoBase.allowActionByVoting(keccak256("flushReserveFundTo"), token);
		daoBase.allowActionByVoting(keccak256("flushDividendsFundTo"), token);

		// 5 - populate groups
		uint i = 0;
		for(i = 0; i < _directors.length; ++i){
			daoBase.addGroupMember("BoD", _directors[i]);
		}

		for(i = 0; i < _employees.length; ++i){
			daoBase.addGroupMember("Employees", _employees[i]);
		}
	}

	/*function setupAac() internal {

		aac = new DaoBaseAuto(daoBase);

		uint VOTING_TYPE_1P1V = 1;
		aac.setVotingParams("manageGroups", VOTING_TYPE_1P1V, 0, "BoD", 50, 50, 0);
		aac.setVotingParams("addNewTask", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		aac.setVotingParams("modifyMoneyscheme", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		aac.setVotingParams("issueTokens", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		aac.setVotingParams("upgradeDaoContract", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		aac.setVotingParams("withdrawDonations", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		aac.setVotingParams("flushReserveFundTo", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);
		aac.setVotingParams("flushDividendsFundTo", VOTING_TYPE_1P1V, (24 * 60), "BoD", 50, 50, 0);

		daoBase.allowActionByAddress(keccak256("manageGroups"), aac);
		daoBase.allowActionByAddress(keccak256("addNewProposal"), aac);
		daoBase.allowActionByAddress(keccak256("modifyMoneyscheme"), aac);

		aac.transferOwnership(msg.sender);
	}*/

}
