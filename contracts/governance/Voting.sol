pragma solidity ^0.4.22;

import "../IDaoBase.sol";
import "./IVoting.sol";
import "./IProposal.sol";
import "./VotingLib.sol";
import "../tokens/StdDaoToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// TODO Stacked voting:
// 1 - client transfers N tokens for D days
// 2 - client calls vote(_yes, _tokenAmount) 
// 3 - the result is calculated

contract Voting is IVoting, Ownable {
	using VotingLib for VotingLib.VotingStorage;
	VotingLib.VotingStorage store;
	event Voted(address _who, bool _yes);
	event CallAction();
	event DelegatedTo(address _sender, uint _tokensAmount);
	event DelegationRemoved(address _from, address _to);
	
	/*
	 * @param _daoBase – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _votingType – one of the voting type, see enum votingType
	 * @param _groupName – for votings that for daoBase group members only
	 * @param _tokenAddress – for votings that uses token amount of voter
	*/
	constructor(IDaoBase _daoBase, IProposal _proposal, 
		address _origin, VotingLib.VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		address _tokenAddress) public 
	{
		store.generalConstructor(
			_daoBase,
			_proposal, 
			_origin, 
			_votingType, 
			_minutesToVote, 
			_groupName, 
			_quorumPercent, 
			_consensusPercent, 
			_tokenAddress
		);
	}

	/**
	* @return percent of group members to make quorum reached.
	* @dev If minutesToVote==0 and quorum reached -> voting is finished
	*/
	function quorumPercent() public view returns(uint) {
		return store.quorumPercent;
	}

	/**
	* @return percent of voters to make consensus reached
	* @dev If consensus reached -> voting is finished with YES result
	*/
	function consensusPercent() public view returns(uint) {
		return store.consensusPercent;
	}	

	/**
	* @return name of group
	* @dev for votings that for daoBase group members only
	*/
	function groupName() public view returns(string) {
		return store.groupName;
	}		

	/**
	* @return number of total voters
	*/
	function getVotersTotal() public view returns(uint) {
		return store.getVotersTotal();
	}

	/**
	* @param _voter address of voter
	* @return power of voter
	*/
	function getPowerOf(address _voter) public view returns(uint) {
		return store.getPowerOf(_voter);
	}

	/**
	* @dev vote positive from the originator of the voting
	*/
	function voteFromOriginPositive() public {
		store.libVote(store.votingCreator, true);
	}

	/**
	* @param _isYes vote
	* @dev vote function
	*/
	function vote(bool _isYes) public {
		store.libVote(msg.sender, _isYes);
	}

	/**
	* @dev call action when voting finished with yes
	*/
	function callActionIfEnded() public {
		store.callActionIfEnded();
	}

	/**
	* @return true if voting finished
	*/
	function isFinished() public view returns(bool) {
		return store.isFinished();
	}

	/**
	* @return true if voting finished with yes
	*/
	function isYes() public view returns(bool) {
		return store.isYes();
	}

	/**
	* @return amount of yes, no and voters total
	*/
	function getVotingStats() public view returns(uint yesResults, uint noResults, uint votersTotal) {
		return store.getVotingStats();
	}

	/**
	* @notice This function should be called only by owner
	* @return cancel voting
	*/
	function cancelVoting() public onlyOwner {
		store.canceled = true;
	}

	// ------------------ LIQUID ------------------
	/**
	* @param _of address
	* @return delegated power for account _of
	*/
	function getDelegatedPowerOf(address _of) public view returns(uint) {
		return store.getDelegatedPowerOf(_of);
	}

	/**
	* @param _to address
	* @return delegated power to account _to by msg.sender
	*/
	function getDelegatedPowerByMe(address _to) public view returns(uint) {
		return store.getDelegatedPowerByMe(_to);
	}

	/**
	* @param _to address
	* @param _tokenAmount amount of tokens which will be delegated
	* @dev delegate power to account _to by msg.sender
	*/
	function delegateMyVoiceTo(address _to, uint _tokenAmount) public {
		store.delegateMyVoiceTo(_to, _tokenAmount);
	}

	/**
	* @param _to address
	* @dev remove delegation for account _to
	*/
	function removeDelegation(address _to) public {
		store.removeDelegation(_to);
	}
}
