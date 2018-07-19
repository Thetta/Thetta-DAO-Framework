pragma solidity ^0.4.22;

import "../IDaoBase.sol";

import "../governance/Voting.sol";
// import "../governance/Voting_1p1v.sol";
// import "../governance/Voting_SimpleToken.sol";
import "../governance/Proposals.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title GenericCaller
 * @dev This is a wrapper that help us to do action that CAN require votings
 * WARNING: should be permitted to add new proposal by the current DaoBase!!!
*/
contract GenericCaller is DaoClient, Ownable {
	enum VotingType {
		NoVoting,
		Voting1p1v,
		VotingSimpleToken,
		VotingQuadratic
	}

	struct VotingParams {
		VotingType votingType;
		uint minutesToVote;
		uint quorumPercent;
		uint consensusPercent;
		uint[] paramUints;
		address[] paramAddresses;
		bool[] paramBools; 
		string paramString;
	}

	mapping (bytes32=>VotingParams) votingParams;

	event GenericCaller_DoActionDirectly(bytes32 _permissionId, address _target, address _origin, string _methodSig);
	event GenericCaller_CreateNewProposal(bytes32 _permissionId, address _target, address _origin, string _methodSig);

/////
	constructor(IDaoBase _dao)public
		// DaoClient (for example) helps us to handle DaoBase upgrades
		// and will automatically update the 'dao' to the new instance
		DaoClient(_dao)
	{
	}

	// _actionId is something like "issueTokens"
	// _methodSig some kind of "issueTokens(bytes32[])"
	function doAction(bytes32 _permissionId, address _target, address _origin, string _methodSig, bytes32[] _params) internal returns(address proposalOut) 
	{
		if(dao.isCanDoAction(msg.sender, _permissionId)){
			emit GenericCaller_DoActionDirectly(_permissionId, _target, _origin, _methodSig);

			// 1 - call immediately?
			if(!address(_target).call(
				bytes4(keccak256(_methodSig)),
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params)){
				revert();
			}

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
			emit GenericCaller_CreateNewProposal(_permissionId, _target, _origin, _methodSig);

			// _origin is the initial msg.sender (just like tx.origin) 
			GenericProposal prop = new GenericProposal(_target, _origin, _methodSig, _params);

			IVoting voting = createVoting(_permissionId, prop, _origin);
			prop.setVoting(voting);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			// check your permissions or see examples (tests) how to do that correctly
			dao.addNewProposal(prop);
			return prop;
		}
	}

	function setVotingParams(bytes32 _permissionIdHash, uint _votingType, 
		uint _minutesToVote,
		uint _quorumPercent, uint _consensusPercent, 
		uint[] _paramUints, address[] _paramAddresses, 
		bool[] _paramBools, string _paramString) public onlyOwner
	{
		VotingParams memory params;
		params.votingType = VotingType(_votingType);	
		params.minutesToVote = _minutesToVote;
		params.quorumPercent = _quorumPercent;
		params.consensusPercent = _consensusPercent;
		params.paramUints = _paramUints;
		params.paramAddresses = _paramAddresses;
		params.paramBools = _paramBools;
		params.paramString = _paramString;

		votingParams[_permissionIdHash] = params;
	}

	function createVoting(bytes32 _permissionIdHash, IProposal _proposal, address _origin)internal returns(IVoting){
		VotingParams memory vp = votingParams[_permissionIdHash];

		if(VotingType.Voting1p1v==vp.votingType){
			return new Voting_1p1v(dao, _proposal, _origin,
				vp.minutesToVote,
				vp.quorumPercent,
				vp.consensusPercent,
				vp.paramString
			);

		}else if(VotingType.VotingSimpleToken==vp.votingType){
			return new Voting_SimpleToken(dao, _proposal, _origin,
				vp.minutesToVote,
				vp.quorumPercent,
				vp.consensusPercent,
				vp.paramAddresses[0],
				vp.paramUints[0]
			);

		}else if(VotingType.VotingQuadratic==vp.votingType){
			return new Voting_Quadratic(dao, _proposal, _origin,
				vp.minutesToVote,
				vp.quorumPercent,
				vp.consensusPercent,
				vp.paramAddresses[0],
				vp.paramUints[0]
			);
		}else{
			revert();
		}
	}

	// function bytes32ToString(bytes32 x)pure internal returns(string){
	// 	bytes memory bytesString = new bytes(32);
	// 	uint charCount = 0;
	// 	for (uint j = 0; j < 32; j++) {
	// 		byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
	// 		if (char != 0) {
	// 			bytesString[charCount] = char;
	// 			charCount++;
	// 		}
	// 	}
	// 	bytes memory bytesStringTrimmed = new bytes(charCount);
	// 	for (j = 0; j < charCount; j++) {
	// 		bytesStringTrimmed[j] = bytesString[j];
	// 	}
	// 	return string(bytesStringTrimmed);
	// }
}

