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

	/**
	* @return text of the proposal
	*/
	function getProposalText() public view returns(string) {
		return proposalText;
	}

// IVoting implementation
	/**
	* @notice This function should be called only by owner
	* @param _voting voting instance (address)
	* @dev this function sets voting to proposal
	*/
	function setVoting(IVoting _voting) public onlyOwner {
		voting = _voting;
	}

	/**
	* @return voting address
	*/
	function getVoting() public view returns(IVoting) {
		return voting;
	}

	function action() public {
		return;
	}
}
