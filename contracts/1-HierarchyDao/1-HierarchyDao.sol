pragma solidity ^0.4.22;

import "../DaoBase.sol";
import "../DaoBaseAuto.sol";
import "../tokens/StdDaoToken.sol";

contract HierarchyDao is DaoBaseWithUnpackers {
	constructor(DaoStorage _store)public DaoBaseWithUnpackers(_store){
	}
}

contract HierarchyDaoFactory {

	StdDaoToken public token;
	DaoStorage store;

	HierarchyDao public dao;
	DaoBaseAuto public aac;

	address[] tokens;

	constructor(
		address _boss, 
		address[] _managers, 
		address[] _employees, 
		address[] _outsiders
	) public {
		createDao(_boss, _managers, _employees, _outsiders);
		// setupAac();
	}
	
	function createDao(
		address _boss, 
		address[] _managers,
		address[] _employees,
		address[] _outsiders
	) internal returns(address) {

		// 1 - create
		token = new StdDaoToken("StdToken", "STDT", 18, true, true, 1e9);
		tokens.push(address(token));
		
		store = new DaoStorage(tokens);
		dao = new HierarchyDao(store);

		store.allowActionByAddress(keccak256("manageGroups"), address(this));

		token.transferOwnership(dao);
		store.transferOwnership(dao);

		// 2 - setup
		setPermissions(_boss, _managers, _employees);

		// 3 - return
		dao.transferOwnership(msg.sender);
		return dao;
	}

	function setPermissions(address _boss, address[] _managers, address[] _employees) internal {

		// 1 - grant all permissions to the boss
		dao.addGroupMember("Managers", _boss);
		dao.addGroupMember("Employees", _boss);

		dao.allowActionByAddress(keccak256("issueTokens"), _boss); 
		dao.allowActionByAddress(keccak256("upgradeDaoContract"), _boss);

		// 2 - set managers group permission
		dao.allowActionByAnyMemberOfGroup(keccak256("addNewProposal"), "Managers");
		dao.allowActionByAnyMemberOfGroup(keccak256("addNewTask"), "Managers");
		dao.allowActionByAnyMemberOfGroup(keccak256("startTask"), "Managers");
		dao.allowActionByAnyMemberOfGroup(keccak256("startBounty"), "Managers");

		// 3 - set employees group permissions
		dao.allowActionByAnyMemberOfGroup(keccak256("startTask"), "Employees");
		dao.allowActionByAnyMemberOfGroup(keccak256("startBounty"), "Employees");

		// 4 - the rest is by voting only (requires addNewProposal permission)
		// so accessable by Managers only even with voting
		dao.allowActionByVoting(keccak256("manageGroups"), token);

		// 5 - populate groups
		uint i = 0;
		for(i = 0; i < _managers.length; ++i) {
			dao.addGroupMember("Managers", _managers[i]);
		}
		for(i = 0; i < _employees.length; ++i){
			dao.addGroupMember("Employees", _employees[i]);
		}

	}

	/*function setupAac() internal {

		aac = new DaoBaseAuto(dao);

		// set voring params 1 person 1 vote
		uint8 VOTING_TYPE_1P1V = 1;
		aac.setVotingParams("manageGroups", VOTING_TYPE_1P1V, bytes32(0), "Managers", bytes32(50), bytes32(50), 0);

		dao.allowActionByAddress(keccak256("addNewProposal"), aac);
		dao.allowActionByAddress(keccak256("manageGroups"), aac);

		aac.transferOwnership(msg.sender);
	}*/
	
}