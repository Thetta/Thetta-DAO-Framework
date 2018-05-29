pragma solidity ^0.4.15;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

import '../DaoBaseAuto.sol';

contract HierarchyDaoFactory {
	DaoBaseWithUnpackers public daoBase;

	StdDaoToken token;
	DaoStorage store;

	function createDao(address _boss, address[] _managers, address[] _employees) public returns(address) {
		// 1 - create
	   token = new StdDaoToken("StdToken", "STDT", 18);
		store = new DaoStorage(token);
		daoBase = new DaoBaseWithUnpackers(store);

		store.allowActionByAddress(keccak256("manageGroups"),this);

		token.transferOwnership(daoBase);
		store.transferOwnership(daoBase);

		// 2 - setup
		setPermissions(_boss, _managers, _employees);

		// 3 - return 
		daoBase.transferOwnership(msg.sender);
		return daoBase;
	}

	function setPermissions(address _boss, address[] _managers, address[] _employees) internal {
		daoBase.addGroup("Employees");
		daoBase.addGroup("Managers");

		// 1 - grant all permissions to the _boss (i.e. "the monarch")
		daoBase.addGroupMember("Managers", _boss);
		daoBase.addGroupMember("Employees", _boss);
		daoBase.allowActionByAddress("modifyMoneyscheme",_boss);
		daoBase.allowActionByAddress("issueTokens", _boss);
		daoBase.allowActionByAddress("upgradeDaoContract", _boss);
		daoBase.allowActionByAddress("withdrawDonations", _boss);
		daoBase.allowActionByAddress("flushReserveFundTo", _boss);
		daoBase.allowActionByAddress("flushDividendsFundTo", _boss);

		// 2 - set Managers group permissions
		daoBase.allowActionByAnyMemberOfGroup("addNewProposal","Managers");
		daoBase.allowActionByAnyMemberOfGroup("addNewTask","Managers");
		daoBase.allowActionByAnyMemberOfGroup("startTask","Managers");
		daoBase.allowActionByAnyMemberOfGroup("startBounty","Managers");

		// 3 - set Employees group permissions 
		daoBase.allowActionByAnyMemberOfGroup("startTask","Employees");
		daoBase.allowActionByAnyMemberOfGroup("startBounty","Employees");

		// 4 - the rest is by voting only (requires addNewProposal permission)
		// so accessable by Managers only even with voting
		daoBase.allowActionByVoting("manageGroups", token);
		daoBase.allowActionByVoting("modifyMoneyscheme", token);

		// 6 - populate groups
		uint i = 0;
		for(i=0; i<_managers.length; ++i){
			daoBase.addGroupMember("Managers", _managers[i]);
		}

		for(i=0; i<_employees.length; ++i){
			daoBase.addGroupMember("Employees", _employees[i]);
		}
	}
}

contract AacFactory {
	AutoDaoBaseActionCaller public aac; 

	// set the auto caller
	function setupAac(IDaoBase daoBase) public {
		aac = new AutoDaoBaseActionCaller(daoBase);

		aac.setVotingParams("manageGroups", 1, (24 * 60), keccak256("Managers"), 0);
		aac.setVotingParams("modifyMoneyscheme", 1, (24 * 60), keccak256("Managers"), 0);

		daoBase.allowActionByAddress("addNewProposal", aac);
		daoBase.allowActionByAddress("manageGroups", aac);
		daoBase.allowActionByAddress("modifyMoneyscheme", aac);
	}
}
