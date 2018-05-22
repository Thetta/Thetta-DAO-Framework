pragma solidity ^0.4.15;

import './governance/IProposal.sol';

interface IMicrocompanyObserver {
	function onUpgrade(address _newAddress) public;
}

interface IMicrocompanyBase {
	function addObserver(IMicrocompanyObserver _observer)public;

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
contract MicrocompanyUser is IMicrocompanyObserver {
	IMicrocompanyBase mc;

   modifier isCanDo(string _what){
		require(mc.isCanDoAction(msg.sender, _what)); 
		_; 
	}

	function MicrocompanyUser(IMicrocompanyBase _mc)public{
		mc = _mc;
		mc.addObserver(this);
	}

	function onUpgrade(address _newAddress) public {
		require(msg.sender==address(mc));	
		mc = IMicrocompanyBase(_newAddress);
	}
}
