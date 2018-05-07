pragma solidity ^0.4.15;

contract IMicrocompany {
	// Employee
	function addNewEmployee(address _newEmployee) public;
	function isEmployee(address _a)public constant returns(bool);

	// Tokens
	// TODO: what type of tokens?
	function issueTokens(address _to, uint amount);

	// Governance 
	function addNewVote(address _vote) public;

	// Moneyflow and Tasks
	function isCanDoAction(address _a, string _permissionName)public constant returns(bool);
	function addNewWeiTask(address _weiTask) public;
}
