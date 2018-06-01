pragma solidity ^0.4.15;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

import '../DaoBaseAuto.sol';
import '../moneyflow/MoneyflowAuto.sol';

contract HierarchyDaoFactory {
	StdDaoToken token;
	DaoStorage store;

	DaoBaseWithUnpackers public daoBase;
	AutoDaoBaseActionCaller public aac;
	
	function HierarchyDaoFactory(address _boss, address[] _managers, address[] _employees)public{
		createDao(_boss, _managers, _employees);

		setupAac();
	}

	function createDao(address _boss, address[] _managers, address[] _employees) internal returns(address) {
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
		daoBase.addGroup("Managers");
		daoBase.addGroup("Employees");

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

		// 5 - populate groups
		uint i = 0;
		for(i=0; i<_managers.length; ++i){
			daoBase.addGroupMember("Managers", _managers[i]);
		}

		for(i=0; i<_employees.length; ++i){
			daoBase.addGroupMember("Employees", _employees[i]);
		}
	}

	// WARNING:
	// Unfortunately creating AutoDaoBaseActionCaller here caused some weird bug 
	// with OutOfGas...That's why i moved AutoDaoBaseActionCaller creation outside of this contract
	function setupAac() internal {
		aac = new AutoDaoBaseActionCaller(IDaoBase(daoBase));

		uint VOTING_TYPE_1P1V = 1;
		aac.setVotingParams("manageGroups", VOTING_TYPE_1P1V, (24 * 60), "Managers", 0);

		daoBase.allowActionByAddress("addNewProposal", aac);
		daoBase.allowActionByAddress("manageGroups", aac);
		//daoBase.allowActionByAddress("issueTokens", aac);
		//daoBase.allowActionByAddress("upgradeDaoContract", aac);

		aac.transferOwnership(msg.sender);
	}

	// WARNING:
	// Unfortunately creating AutoMoneyflowActionCaller here caused some weird bug 
	// with OutOfGas...That's why i moved AutoDaoBaseActionCaller creation outside of this contract
	function setupAmac(AutoMoneyflowActionCaller _amac) public {
		uint VOTING_TYPE_1P1V = 1;
		_amac.setVotingParams("modifyMoneyscheme", VOTING_TYPE_1P1V, (24 * 60), "Managers", 0);

		daoBase.allowActionByAddress("addNewProposal", _amac);
		daoBase.allowActionByAddress("modifyMoneyscheme", _amac);

		daoBase.allowActionByAddress("addNewTask", _amac);
		daoBase.allowActionByAddress("setRootWeiReceiver", _amac);
		daoBase.allowActionByAddress("withdrawDonations", _amac);

		_amac.transferOwnership(msg.sender);
	}
}

