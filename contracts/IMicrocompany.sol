pragma solidity ^0.4.15;

import './governance/IProposal.sol';

interface IMicrocompanyBase {
	function upgradeMicrocompanyContract(IMicrocompanyBase _new)public;

// Permissions
	function isCanDoAction(address _a, string _permissionName)public constant returns(bool);

// Governance/Proposals
	function addNewProposal(IProposal _proposal) public;
	function getProposalAtIndex(uint _i)public constant returns(IProposal);
	function getProposalsCount()public constant returns(uint);

// Employees
	function addNewEmployee(address _newEmployee) public;
	function removeEmployee(address _employee) public;
	function isEmployee(address _a)public constant returns(bool);
	function getEmployeesCount()public constant returns(uint);

// Tokens
	// TODO: curently Microcompany has only 1 type of tokens
	// that gives full governance rights - "DefaultToken"
	function issueTokens(address _to, uint amount)public;
}

// Just an easy-to-use wrapper
contract MicrocompanyUser {
	IMicrocompanyBase mc;

   modifier isCanDo(string _what){
		require(mc.isCanDoAction(msg.sender, _what)); 
		_; 
	}

	function MicrocompanyUser(IMicrocompanyBase _mc)public{
		mc = _mc;
	}
}
