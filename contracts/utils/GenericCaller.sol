pragma solidity ^0.4.22;

import "../DaoClient.sol";
import "../IDaoBase.sol";
import "./GenericCallerLib.sol";
import "./UtilsLib.sol";

import "../governance/GenericProposal.sol";
import "../governance/Voting.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title GenericCaller
 * @dev This is a wrapper that help us to do action that CAN require votings
 * WARNING: should be permitted to add new proposal by the current DaoBase!!!
*/
contract GenericCaller is DaoClient, Ownable {
	using GenericCallerLib for GenericCallerLib.GenericCallerStorage;
	GenericCallerLib.GenericCallerStorage store;	

	// DaoClient (for example) helps us to handle DaoBase upgrades
	// and will automatically update the 'daoBase' to the new instance
	constructor(IDaoBase _daoBase)public DaoClient(_daoBase) {
		store.daoBase = _daoBase;
	}

	// _actionId is something like "issueTokens"
	// _methodSig some kind of "issueTokens(bytes32[])"
	function doAction(bytes32 _permissionId, address _target, address _origin, string _methodSig, bytes32[] _params) internal returns(address proposalOut) {
		return store.doAction(_permissionId, _target, _origin, _methodSig, _params);
	}

	// address _origin, uint _minutesToVote,
	// uint _quorumPercent, uint _consensusPercent, VotingType _votingType,
	// string _groupName, address _tokenAddress
	function setVotingParams(
		bytes32 _permissionIdHash, 
		uint _votingType, 
		bytes32 _param1, 
		bytes32 _param2, 
		bytes32 _param3, 
		bytes32 _param4, 
		bytes32 _param5) public onlyOwner 
	{
		store.setVotingParams(_permissionIdHash, _votingType, 
			_param1, _param2, _param3, _param4, _param5);
	}

	function createVoting(bytes32 _permissionIdHash, IProposal _proposal, address _origin)public returns(IVoting) {
		return store.createVoting(_permissionIdHash, _proposal, _origin);
	}
}