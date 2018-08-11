pragma solidity ^0.4.23;

import "../IDaoBase.sol";
import "./UtilsLib.sol";
import "../governance/GenericProposal.sol";
import "../governance/Voting.sol";
import "../governance/VotingLib.sol";

library GenericCallerLib {
	event GenericCaller_DoActionDirectly(bytes32 _permissionId, address _target, address _origin, string _methodSig);
	event GenericCaller_CreateNewProposal(bytes32 _permissionId, address _target, address _origin, string _methodSig);

	struct GenericCallerStorage{
		IDaoBase dao;
		mapping (bytes32=>VotingParams) votingParams;	
	}
	
	struct VotingParams {
		VotingLib.VotingType votingType;
		bytes32 param1;
		bytes32 param2;
		bytes32 param3;
		bytes32 param4;
		bytes32 param5;
	}

	function doAction(GenericCallerStorage storage store, bytes32 _permissionId, address _target, address _origin, string _methodSig, bytes32[] _params) internal returns(address proposalOut) {
		
		if(store.dao.isCanDoAction(msg.sender, _permissionId)) {
			emit GenericCaller_DoActionDirectly(_permissionId, _target, _origin, _methodSig);

			// 1 - call immediately
			if(!address(_target).call(
				bytes4(keccak256(_methodSig)),
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params)){
				revert();
			}

			return 0x0;
		}else {
			// 2 - create a proposal + voting first  
			emit GenericCaller_CreateNewProposal(_permissionId, _target, _origin, _methodSig);

			// _origin is the initial msg.sender (just like tx.origin) 
			GenericProposal prop = new GenericProposal(_target, _origin, _methodSig, _params);

			IVoting voting = createVoting(store, _permissionId, prop, _origin);
			prop.setVoting(voting);

			// 3 - add the proposal
			// WARNING: should be permitted to add new proposal by the current contract address!!!
			// check your permissions or see examples (tests) how to do that correctly
			store.dao.addNewProposal(prop);

			// 4 - do first vote 
			// voting can be finished immediately and action can be called right here ->
			voting.voteFromOriginPositive();
			return prop;
		}
	}

	function setVotingParams(GenericCallerStorage storage store, bytes32 _permissionIdHash, uint _votingType, 
		bytes32 _param1, bytes32 _param2, 
		bytes32 _param3, bytes32 _param4, bytes32 _param5) public {
		VotingParams memory params;
		params.votingType = VotingLib.VotingType(_votingType);
		params.param1 = _param1;
		params.param2 = _param2;
		params.param3 = _param3;
		params.param4 = _param4;
		params.param5 = _param5;

		store.votingParams[_permissionIdHash] = params;
	}

	function createVoting(GenericCallerStorage storage store, 
		bytes32 _permissionIdHash, IProposal _proposal, address _origin)public returns(IVoting) {
		VotingParams memory vp = store.votingParams[_permissionIdHash];

		IVoting V = new Voting(
			store.dao, 
			_proposal, 
			_origin, 
			vp.votingType,
			uint(vp.param1), 
			UtilsLib.bytes32ToString(vp.param2),
			uint(vp.param3), 
			uint(vp.param4),
			address(vp.param5)
		);

		return V;
	}

	function bytes32ToString(bytes32 x) public pure returns (string) {
		return UtilsLib.bytes32ToString(x);
	}	
}
