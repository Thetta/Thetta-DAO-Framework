pragma solidity ^0.4.15;

import "../IDaoBase.sol";

import "../governance/Voting.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract GenericProposal is IProposal, Ownable {
	IVoting voting;

	address target;
	string methodSig;
	bytes32[] params;

	function GenericProposal(address _target, address _origin, string _methodSig, bytes32[] _params) public {
		target = _target;
		params = _params;
		methodSig = _methodSig;
	}

// IVoting implementation
	function action(IDaoBase _mc, IVoting _voting) public {
		require(address(voting)!=0x0);
		require(msg.sender==address(voting));

		// cool! voting is over and the majority said YES -> so let's go!
		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		target.call(
			bytes4(keccak256(methodSig)),
			uint256(32),				// pointer to the length of the array
			uint256(params.length), // length of the array
			params);						// array itself
	}

	function setVoting(IVoting _voting) public onlyOwner{
		voting = _voting;
	}

	function getVoting()public constant returns(IVoting){
		return voting;
	}
}

// This is a wrapper that help us to do action that CAN require votings
// WARNING: should be permitted to add new proposal by the current DaoBase!!!
contract GenericCaller is DaoClient {
	function GenericCaller(IDaoBase _mc)public
		// DaoClient (for example) helps us to handle DaoBase upgrades
		// and will automatically update the 'mc' to the new instance
		DaoClient(_mc)	
	{
	}

	// _actionId is something like "issueTokens"
	// _methodSig some kind of "issueTokens(bytes32[])"
	function doAction(string _permissionsId, address _target, address _origin, string _methodSig, bytes32[] _params) public returns(address proposalOut) 
	{
		if(mc.isCanDoAction(msg.sender, _permissionsId)){
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

			// _origin is the initial msg.sender (just like tx.origin) 
			GenericProposal prop = new GenericProposal(_target, _origin, _methodSig, _params);

			IVoting voting = createVoting(_permissionsId, prop, _origin);
			prop.setVoting(voting);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			// check your permissions or see examples (tests) how to do that correctly
			mc.addNewProposal(prop);		
			return prop;
		}
	}

	function setVotingType(string _permissionsId, string _votingType, bytes32 _param1, bytes32 _param2) public {
		// TODO
	}	

	function createVoting(string _permissionsId, IProposal _proposal, address _origin)internal returns(IVoting){
		// TODO

		//return new Voting(mc, _proposal, _origin, Voting.VoteType.EmployeesVote, 24 *60, 0x0);

		return new Voting_1p1v(mc, _proposal, _origin, 24 *60, "Employees");
	}
}

