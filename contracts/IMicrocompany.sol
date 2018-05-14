pragma solidity ^0.4.15;

import './governance/IProposal.sol';

contract IMicrocompany {
// Employees
	function addNewEmployee(address _newEmployee) public;
	function removeEmployee(address _employee) public;
	function isEmployee(address _a)public constant returns(bool);
	function getEmployeesCount()public constant returns(uint);

// Tokens
	// TODO: curently Microcompany has only 1 type of tokens
	// that gives full governance rights - "DefaultToken"
	function getTokenInfo() public constant returns(address _out);
	function issueTokens(address _to, uint amount)public;

// Governance 
	function addNewProposal(IProposal _proposal) public;

// Tasks
	function isCanDoAction(address _a, string _permissionName)public constant returns(bool);
}
