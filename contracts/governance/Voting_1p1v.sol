pragma solidity ^0.4.22;

import '../IDaoBase.sol';

import './IVoting.sol';
import './IProposal.sol';

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Voting_1p1v 
 * @dev This is the implementation of IVoting interface. Each Proposal should have voting attached. 
 * If group members change -> it will not work
*/
contract Voting_1p1v is Ownable {
	// use DaoClient instead?
	// (it will handle upgrades)
	IDaoBase dao;
	IProposal proposal; 

	uint public minutesToVote;
	bool finishedWithYes;
	uint64 genesis;
	uint public quorumPercent;
	uint public consensusPercent;
	string public groupName;

	mapping (address=>bool) addressVotedAlready;
	address[] employeesVotedYes;
	address[] employeesVotedNo;

	event  Voting1p1v_Vote(address _who, bool _yes);
	event  Voting1p1v_CallAction();

	/**
	 * TODO: 
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _groupName - members of which group can vote.
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	*/

	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent) public 
	{
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));

		dao = _dao;
		proposal = _proposal;
		minutesToVote = _minutesToVote;
		groupName = _groupName;
		quorumPercent = _quorumPercent;
		consensusPercent = _consensusPercent;
		genesis = uint64(now);

		internalVote(_origin, true);
	}

	function isFinished() public view returns(bool){
		if(minutesToVote!=0){
			return _isTimeElapsed();
		}

		if(finishedWithYes){
			return true;
		}

		return _isQuorumReached();
	}

	function _isTimeElapsed() internal view returns(bool){
		if(minutesToVote==0){
			return false;
		}

		return (uint64(now) - genesis) >= (minutesToVote * 60 * 1000);
	}

	function _isQuorumReached() internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = getVotingStats();
		return ((yesResults + noResults) * 100) >= (votersTotal * quorumPercent);
	}

	function _isConsensusReached() internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = getVotingStats();
		return (yesResults * 100) >= ((yesResults + noResults) * consensusPercent);
	}

	function isYes() public view returns(bool){
		if(true==finishedWithYes){
			return true;
		}

		return isFinished() && 
				 _isQuorumReached() &&
				 _isConsensusReached();
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}

	function vote(bool _yes, uint _tokenAmount) public {
		require(!isFinished());
		// This voting type does not deal with tokens, that's why _tokenAmount should be ZERO
		require(0==_tokenAmount);

		internalVote(msg.sender, _yes);
	}

	function internalVote(address _who, bool _yes) internal {
		require(dao.isGroupMember(groupName, _who));
		require(!addressVotedAlready[_who]);

		if(_yes){
			employeesVotedYes.push(_who);
		}else{
			employeesVotedNo.push(_who);
		}

		addressVotedAlready[_who] = true;
		emit  Voting1p1v_Vote(_who, _yes);

		callActionIfEnded();
	}

	function callActionIfEnded() public {
		if(!finishedWithYes && isFinished() && isYes()){ 
			// should not be callable again!!!
			finishedWithYes = true;

			// can throw!
			emit  Voting1p1v_CallAction();
			proposal.action();
		}
	}

	function filterResults(address[] _votersTotal) internal constant returns(uint){
		uint votedCount = 0;

		for(uint i=0; i<_votersTotal.length; ++i){
			if(dao.isGroupMember(groupName,_votersTotal[i])){
				// count this vote
				votedCount++;
			}
		}
		return votedCount;
	}

	function getVotingStats() public constant returns(uint yesResults, uint noResults, uint votersTotal){
		yesResults = filterResults(employeesVotedYes);
		noResults = filterResults(employeesVotedNo);
		votersTotal = dao.getMembersCount(groupName);
		return;
	}

}
