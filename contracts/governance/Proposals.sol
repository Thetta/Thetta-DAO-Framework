pragma solidity ^0.4.15;

import "../IDaoBase.sol";

import "../governance/Voting.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract InformalProposal is IProposal, Ownable {
	string proposalText = '';
	IVoting voting;

	function action(IDaoBase _mc, IVoting _voting)public{
		return;
	}

	function InformalProposal(string _proposalText) public {
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
}