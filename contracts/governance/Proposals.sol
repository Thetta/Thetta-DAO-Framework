pragma solidity ^0.4.22;

import "../IDaoBase.sol";

import "../governance/Voting.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// This is an auto proposal that is used by GenericCaller to 
// call actions on a _target 
contract GenericProposal is IProposal, Ownable {
	IVoting voting;

	address target;
	string methodSig;
	bytes32[] params;

	constructor(address _target, address _origin, string _methodSig, bytes32[] _params) public {
		target = _target;
		params = _params;
		methodSig = _methodSig;
	}

	event GenericProposal_Action(IVoting _voting);

// IVoting implementation
	function action(IDaoBase _dao, IVoting _voting) public {
		emit GenericProposal_Action(voting);

		// in some cases voting is still not set
		if(0x0!=address(voting)){
			require(msg.sender==address(voting));
		}

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

// This proposal has no action and no consequences 
// It should be used just for informal purps. 
// i.e. with messages like "Lets switch to Slack?"
contract InformalProposal is IProposal, Ownable {
	string proposalText = '';
	IVoting voting;

	constructor(string _proposalText) public {
		proposalText = _proposalText;
	}

	function getProposalText()public constant returns(string){
		return proposalText;
	}

// IVoting implementation
	function setVoting(IVoting _voting) public onlyOwner{
		voting = _voting;
	}

	function getVoting()public constant returns(IVoting){
		return voting;
	}

	function action(IDaoBase _dao, IVoting _voting)public{
		return;
	}
}
