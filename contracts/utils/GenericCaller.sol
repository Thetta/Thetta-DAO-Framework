pragma solidity ^0.4.15;

import "../IDaoBase.sol";

import "../governance/Voting.sol";
import "../governance/Proposals.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// This is a wrapper that help us to do action that CAN require votings
// WARNING: should be permitted to add new proposal by the current DaoBase!!!
contract GenericCaller is DaoClient, Ownable {
	enum VotingType {
		NoVoting,

		Voting1p1v,
		VotingSimpleToken,
		VotingQuadratic
	}

	struct VotingParams {
		VotingType votingType;
		bytes32 param1;
		bytes32 param2;
		bytes32 param3;
	}

	mapping (bytes32=>VotingParams) votingParams;

	event GenericCaller_DoActionDirectly(string permission);
	event GenericCaller_CreateNewProposal(string permission);

/////
	function GenericCaller(IDaoBase _mc)public
		// DaoClient (for example) helps us to handle DaoBase upgrades
		// and will automatically update the 'mc' to the new instance
		DaoClient(_mc)	
	{
	}

	// _actionId is something like "issueTokens"
	// _methodSig some kind of "issueTokens(bytes32[])"
	function doAction(string _permissionId, address _target, address _origin, string _methodSig, bytes32[] _params) public returns(address proposalOut) 
	{
		if(mc.isCanDoAction(msg.sender, _permissionId)){
			emit GenericCaller_DoActionDirectly(_permissionId);

			// 1 - call immediately?
			_target.call(
				bytes4(keccak256(_methodSig)),
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params	
			);					

			/*
			// Delegatecall: 
			// 1. _target storage will be set to THIS contract
			// 2. msg.sender will be set to THE CURRENT msg.sender!
			_target.delegatecall(
				bytes4(keccak256(_methodSig)),
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params	
			);					
		   */

			return 0x0;
		}else{
			// 2 - create proposal + voting first  
			emit GenericCaller_CreateNewProposal(_permissionId);

			// _origin is the initial msg.sender (just like tx.origin) 
			GenericProposal prop = new GenericProposal(_target, _origin, _methodSig, _params);

			IVoting voting = createVoting(_permissionId, prop, _origin);
			prop.setVoting(voting);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			// check your permissions or see examples (tests) how to do that correctly
			mc.addNewProposal(prop);		
			return prop;
		}
	}

	function setVotingParams(string _permissionId, uint _votingType, 
									 bytes32 _param1, bytes32 _param2, bytes32 _param3) public onlyOwner {
		VotingParams memory params;
		params.votingType = VotingType(_votingType);
		params.param1 = _param1;
		params.param2 = _param2;
		params.param3 = _param3;

		votingParams[keccak256(_permissionId)] = params;
	}

	function createVoting(string _permissionId, IProposal _proposal, address _origin)internal returns(IVoting){
		VotingParams memory vp = votingParams[keccak256(_permissionId)];

		if(VotingType.Voting1p1v==vp.votingType){
			return new Voting_1p1v(mc, _proposal, _origin, uint(vp.param1), vp.param2, vp.param3);
		}

		if(VotingType.VotingSimpleToken==vp.votingType){
			// TODO: test
			return new Voting_SimpleToken(mc, _proposal, _origin, uint(vp.param1), address(vp.param2), vp.param3);
		}

		// TODO: add other implementations
		// no implementation for this type!
		assert(false==true);
		return IVoting(0x0);
	}
}

