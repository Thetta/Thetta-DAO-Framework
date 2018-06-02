pragma solidity ^0.4.15;

import './governance/IProposal.sol';

interface IDaoObserver {
	function onUpgrade(address _newAddress) public;
}

interface IDaoBase {
	function addObserver(IDaoObserver _observer)public;

	function upgradeDaoContract(IDaoBase _new)public;

// Groups
	function addGroupMember(string _groupName, address _a) public;
	function removeGroupMember(string _groupName, address _a) public;
	
	function getMembersCount(string _groupName) public constant returns(uint);
	function getMembersCountByHash(bytes32 _groupHash) public constant returns(uint);
	
	function isGroupMember(string _groupName,address _a)public constant returns(bool);
	function isGroupMemberByHash(bytes32 _groupNameHash,address _a)public constant returns(bool);

// Permissions
	function allowActionByShareholder(string _what, address _tokenAddress) public;
	function allowActionByVoting(string _what, address _tokenAddress) public;
	function allowActionByAddress(string _what, address _a) public;
	function allowActionByAnyMemberOfGroup(string _what, string _groupName) public;

	function isCanDoAction(address _a, string _permissionName)public constant returns(bool);

// Tokens
	function issueTokens(address _to, uint amount)public;

// Governance/Proposals
	function addNewProposal(IProposal _proposal) public;
	function getProposalAtIndex(uint _i)public constant returns(IProposal);
	function getProposalsCount()public constant returns(uint);
}

// Just an easy-to-use wrapper
contract DaoClient is IDaoObserver {
	IDaoBase mc;

   modifier isCanDo(string _what){
		require(mc.isCanDoAction(msg.sender, _what)); 
		_; 
	}

	function DaoClient(IDaoBase _mc)public{
		mc = _mc;
		mc.addObserver(this);
	}

	// If your company is upgraded -> then this will automatically update the current mc.
	// mc will point at NEW contract!
	function onUpgrade(address _newAddress) public {
		require(msg.sender==address(mc));	

		mc = IDaoBase(_newAddress);

		// this is not needed because we are already in the list of observers (in the store) 
		// and the controller is upgraded only
		//mc.addObserver(this);
	}
}
