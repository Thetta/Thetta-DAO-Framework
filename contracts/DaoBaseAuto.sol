pragma solidity ^0.4.15;

import "./utils/GenericCaller.sol";

// This contract is a helper that will create new Proposal (i.e. voting) if the action is not allowed directly
contract AutoDaoBaseActionCaller is GenericCaller {
	function AutoDaoBaseActionCaller(IDaoBase _mc)public
		GenericCaller(_mc)
	{
	}

	function addGroupMemberAuto(string _group, address _a) public returns(address proposalOut){
		// TODO: implement 
		assert(false);

		/*
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_group);
		params[1] = bytes32(_a);

	   return doAction("manageGroups", mc, msg.sender,"addGroupMemberGeneric(bytes32[])",params);
	   */
	}

	function issueTokensAuto(address _to, uint _amount) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_to);
		params[1] = bytes32(_amount);

	   return doAction("issueTokens", mc, msg.sender,"issueTokensGeneric(bytes32[])",params);
	}

	function upgradeDaoContractAuto(address _newMc) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);

		return doAction("upgradeDaoContract", mc, msg.sender,"upgradeDaoContractGeneric(bytes32[])",params);
	}
}

