pragma solidity ^0.4.22;

import '../IDaoBase.sol';
import './IVoting.sol';
import './IProposal.sol';
import './VotingLib.sol';
import '../tokens/StdDaoToken.sol';
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
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _votingType – one of the voting type, see enum votingType
	 * @param _groupName – for votings that for dao group members only
	 * @param _tokenAddress – for votings that uses token amount of voter
	*/
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, VotingLib.VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		address _tokenAddress) public 
	{
		store.generalConstructor(_dao, _proposal, _origin, _votingType, _minutesToVote, _groupName, _quorumPercent, _consensusPercent, _tokenAddress);
	}

	function quorumPercent()view returns(uint){
		return store.quorumPercent;
	}

	function consensusPercent()view returns(uint){
		return store.consensusPercent;
	}	

	function groupName()view returns(string){
		return store.groupName;
	}		

	function getVotersTotal() view returns(uint){
		return store.getVotersTotal();
	}

	function getPowerOf(address _voter) view returns(uint){
		return store.getPowerOf(_voter);
	}

	function vote(bool _isYes) public{
		store.libVote(msg.sender, _isYes);
	}

	function callActionIfEnded() public {
		store.callActionIfEnded();
	}

	function isFinished() public view returns(bool){
		return store.isFinished();
	}

	function isYes() public view returns(bool){
		return store.isYes();
	}

	function getVotingStats() public constant returns(uint yesResults, uint noResults, uint votersTotal){
		return store.getVotingStats();
	}

	function cancelVoting() public onlyOwner {
		store.canceled = true;
	}

	// ------------------ LIQUID ------------------
	function getDelegatedPowerOf(address _of) public view returns(uint) {
		return store.getDelegatedPowerOf(_of);
	}

	function getDelegatedPowerByMe(address _to) public view returns(uint) {
		return store.getDelegatedPowerByMe(_to);
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) public {
		store.delegateMyVoiceTo(_to, _tokenAmount);
	}

	function removeDelegation(address _to) public {
		store.removeDelegation(_to);
	}
}