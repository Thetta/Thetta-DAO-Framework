pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../IDaoBase.sol";
import "../governance/IVoting.sol";

/**
 * @title InformalProposal 
 * @dev This is the implementation of IProposal interface. Each Proposal should have voting attached. 
 * This proposal has no action and no consequences 
 * It should be used just for informal purps. 
 * i.e. with messages like "Lets switch to Slack?"
*/
contract InformalProposal is IProposal, Ownable {
	string proposalText = "";
	IVoting voting;

	constructor(string _proposalText) public {
		proposalText = _proposalText;
	}

	function getProposalText() public view returns(string) {
		return proposalText;
	}

// IVoting implementation
	function setVoting(IVoting _voting) public onlyOwner {
		voting = _voting;
	}

	function getVoting() public view returns(IVoting) {
		return voting;
	}

	function action() public {
		return;
	}
}
