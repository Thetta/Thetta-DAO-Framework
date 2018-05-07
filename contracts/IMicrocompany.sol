pragma solidity ^0.4.15;

contract IMicrocompany {
	function addNewEmployee(address _newEmployee) public;
	function isEmployee(address _a)public constant returns(bool);

	function addNewVote(address _vote) public;

	function isCanDoAction(address _a, string _permissionName)public constant returns(bool);

	function addNewWeiTask(address _weiTask) public;
}
