pragma solidity ^0.4.15;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

import '../DaoBaseAuto.sol';
import '../moneyflow/MoneyflowAuto.sol';

contract HierarchyDao is DaoBaseWithUnpackers {
	constructor(DaoStorage _store)public DaoBaseWithUnpackers(_store){

	}
}

contract HierarchyDaoFactory {
	StdDaoToken token;
	DaoStorage store;

	HierarchyDao public dao;
	DaoBaseAuto public aac;
	
	address[] tokens;

	constructor(address _boss, address[] _managers, address[] _employees)public{
		createDao(_boss, _managers, _employees);

		setupAac();
	}

	function createDao(address _boss, address[] _managers, address[] _employees) internal returns(address) {
		// 1 - create
	   token = new StdDaoToken("StdToken", "STDT", 18);
		tokens.push(address(token));

		store = new DaoStorage(tokens);
		dao = new HierarchyDao(store);

		store.allowActionByAddress(keccak256("manageGroups"),this);

		token.transferOwnership(dao);
		store.transferOwnership(dao);

		// 2 - setup
		setPermissions(_boss, _managers, _employees);

		// 3 - return 
		dao.transferOwnership(msg.sender);
		return dao;
	}

	function setPermissions(address _boss, address[] _managers, address[] _employees) internal {
		// 1 - grant all permissions to the _boss (i.e. "the monarch")
		dao.addGroupMember("Managers", _boss);
		dao.addGroupMember("Employees", _boss);

		dao.allowActionByAddress("modifyMoneyscheme",_boss);
		dao.allowActionByAddress("issueTokens", _boss);
		dao.allowActionByAddress("upgradeDaoContract", _boss);
		dao.allowActionByAddress("withdrawDonations", _boss);
		dao.allowActionByAddress("flushReserveFundTo", _boss);
		dao.allowActionByAddress("flushDividendsFundTo", _boss);

		// 2 - set Managers group permissions
		dao.allowActionByAnyMemberOfGroup("addNewProposal","Managers");
		dao.allowActionByAnyMemberOfGroup("addNewTask","Managers");
		dao.allowActionByAnyMemberOfGroup("startTask","Managers");
		dao.allowActionByAnyMemberOfGroup("startBounty","Managers");

		// 3 - set Employees group permissions 
		dao.allowActionByAnyMemberOfGroup("startTask","Employees");
		dao.allowActionByAnyMemberOfGroup("startBounty","Employees");

		// 4 - the rest is by voting only (requires addNewProposal permission)
		// so accessable by Managers only even with voting
		dao.allowActionByVoting("manageGroups", token);
		dao.allowActionByVoting("modifyMoneyscheme", token);

		// 5 - populate groups
		uint i = 0;
		for(i=0; i<_managers.length; ++i){
			dao.addGroupMember("Managers", _managers[i]);
		}

		for(i=0; i<_employees.length; ++i){
			dao.addGroupMember("Employees", _employees[i]);
		}
	}

	function setupAac() internal {
		aac = new DaoBaseAuto(IDaoBase(dao));

		uint VOTING_TYPE_1P1V = 1;
		aac.setVotingParams("manageGroups", VOTING_TYPE_1P1V, bytes32(0), "Managers", bytes32(50), bytes32(50), 0);

		dao.allowActionByAddress("addNewProposal", aac);
		dao.allowActionByAddress("manageGroups", aac);
		//dao.allowActionByAddress("issueTokens", aac);
		//dao.allowActionByAddress("upgradeDaoContract", aac);

		aac.transferOwnership(msg.sender);
	}

	// WARNING:
	// Unfortunately creating MoneyflowAuto here caused some weird bug 
	// with OutOfGas...That's why i moved DaoBaseAuto creation outside of this contract
	function setupAmac(MoneyflowAuto _amac) public {
		uint VOTING_TYPE_1P1V = 1;		
		_amac.setVotingParams("modifyMoneyscheme", VOTING_TYPE_1P1V, bytes32(0), "Managers", bytes32(50), bytes32(50), 0);

		dao.allowActionByAddress("addNewProposal", _amac);
		dao.allowActionByAddress("modifyMoneyscheme", _amac);

		dao.allowActionByAddress("addNewTask", _amac);
		dao.allowActionByAddress("setRootWeiReceiver", _amac);
		dao.allowActionByAddress("withdrawDonations", _amac);

		_amac.transferOwnership(msg.sender);
	}
}

