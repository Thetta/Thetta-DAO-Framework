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
contract Voting_1p1v is IVoting, Ownable {
	// use DaoClient instead?
	// (it will handle upgrades)
	IDaoBase dao;
	IProposal proposal; 

	uint public minutesToVote;
	bool finishedWithYes;
	uint64 genesis;
	uint public quorumPercent;
	uint public consensusPercent;
	bytes32 public emptyParam;
	string public groupName;

	mapping (address=>bool) addressVotedAlready;
	address[] employeesVotedYes;
	address[] employeesVotedNo;

	/**
	 * TODO: 
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _groupName - members of which group can vote.
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _emptyParam - not need here
	*/

	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, bytes32 _emptyParam) public 
	{
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));

		dao = _dao;
		proposal = _proposal;
		minutesToVote = _minutesToVote;
		groupName = _groupName;
		quorumPercent = _quorumPercent;
		consensusPercent = _consensusPercent;
		emptyParam = _emptyParam;
		genesis = uint64(now);

		internalVote(_origin, true);
	}

	function isFinished()external view returns(bool){
		return _isFinished();
	}

	function _isFinished()internal view returns(bool){
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

		(yesResults, noResults, votersTotal) = _getVotingStats();
		return ((yesResults + noResults) * 100) >= (votersTotal * quorumPercent);
	}

	function _isConsensusReached() internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = _getVotingStats();
		return (yesResults * 100) >= ((yesResults + noResults) * consensusPercent);
	}

	function isYes()external view returns(bool){
		return _isYes();
	}

	function _isYes()internal view returns(bool){
		if(true==finishedWithYes){
			return true;
		}

		return _isFinished() && 
				 _isQuorumReached() &&
				 _isConsensusReached();
	}

	function cancelVoting() external onlyOwner {
		// TODO:
	}

	function vote(bool _yes, uint _tokenAmount) external {
		require(!_isFinished());
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

		_callActionIfEnded();
	}

	function callActionIfEnded() external {
		_callActionIfEnded();
	}

	function _callActionIfEnded() internal {
		if(!finishedWithYes && _isFinished() && _isYes()){ 
			// should not be callable again!!!
			finishedWithYes = true;

			// can throw!
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

	function getVotingStats() external constant returns(uint yesResults, uint noResults, uint votersTotal){
		return _getVotingStats();
	}

	function _getVotingStats() internal constant returns(uint yesResults, uint noResults, uint votersTotal){
		yesResults = filterResults(employeesVotedYes);
		noResults = filterResults(employeesVotedNo);
		votersTotal = dao.getMembersCount(groupName);
		return;	
	}	
}
