pragma solidity ^0.4.22;

import '../IDaoBase.sol';
import './IVoting.sol';
import './IProposal.sol';
import '../tokens/StdDaoToken.sol';
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Voting_1p1v 
 * @dev This is the implementation of IVoting interface. Each Proposal should have voting attached. 
 * If group members change -> it will not work
*/
contract Voting is IVoting, Ownable {
	IDaoBase dao;
	IProposal proposal; 

	uint public minutesToVote;
	bool finishedWithYes;
	bool canceled = false;
	uint64 genesis;
	uint public quorumPercent;
	uint public consensusPercent;
	string public groupName;

	uint[] paramUints;
	address[] paramAddresses;
	bool[] paramBools;

	struct Vote{
		address voter;
		bool isYes;
	}

	mapping(address=>bool) voted;
	mapping(uint=>Vote) votes;

	uint votesCount = 0;

	event Voted(address _who, bool _yes);
	event CallAction();

	/**
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _groupName - members of which group can vote.
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _paramUints - custom params
	 * @param _paramAddresses - custom params
	 * @param _paramBools - custom params
	*/
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		uint[] _paramUints, address[] _paramAddresses, bool[] _paramBools) public 
	{
		_generalConstructor(_dao,  _proposal, _origin,  _minutesToVote,  _groupName, _quorumPercent,  _consensusPercent);
		_customConstructor(_paramUints, _paramAddresses, _paramBools);
		_vote(_origin, true);
	}

	function _generalConstructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent) internal
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
	}

	function _customConstructor(uint[] _paramUints, address[] _paramAddresses, bool[] _paramBools) internal{
		paramUints = _paramUints;
		paramAddresses = _paramAddresses;
		paramBools = _paramBools;
	}

	function getVoterPower(address _voter) view returns(uint){
		return 1;
	}

	function vote(bool _isYes) public {
		require(dao.isGroupMember(groupName, msg.sender));
		require(!isFinished());
		require(!voted[msg.sender]);
		_vote(msg.sender, _isYes);
	}

	function _vote(address _voter, bool _isYes) internal {
		votes[votesCount] = Vote(_voter, _isYes);
		voted[_voter] = true;
		emit Voted(_voter, _isYes);
		votesCount += 1;
		callActionIfEnded();
	}

	function callActionIfEnded() public {
		if(!finishedWithYes && isFinished() && isYes()){ 
			// should not be callable again!!!
			finishedWithYes = true;
			emit CallAction();
			proposal.action(); // can throw!
		}
	}

	function isFinished() public view returns(bool){
		if(canceled){
			return true;
		}

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
		return !canceled &&
			isFinished() && 
			_isQuorumReached() && 
			_isConsensusReached();
	}

	function getVotingStats() public constant returns(uint yesResults, uint noResults, uint votersTotal){
		for(uint i=0; i<votesCount; ++i){
			if(dao.isGroupMember(groupName,votes[i].voter)){
				if(votes[i].isYes){
					yesResults+= getVoterPower(votes[i].voter);
				}else{
					noResults+= getVoterPower(votes[i].voter);
				}		
			}
		}
		votersTotal = dao.getMembersCount(groupName);
		
		return;
	}

	function cancelVoting() public onlyOwner {
		canceled = true;
	}	
}


// --------------------- IMPLEMENTATIONS ---------------------

contract Voting_1p1v is Voting {
	function getVoterPower(address _voter) view returns(uint){ // SAME as in Voting
		return 1;
	}
}

contract Voting_SimpleToken is Voting {
	function getVoterPower(address _voter) view returns(uint){
		uint votingID = paramUints[0];
		address tokenAddress = paramAddresses[0];
		uint tokenAmount = StdDaoToken(tokenAddress).getBalanceAtVoting(votingID, _voter);
		return tokenAmount;
	}
}

contract Voting_TokenQuadratic is Voting {
	function getVoterPower(address _voter) view returns(uint){
		uint votingID = paramUints[0];
		address tokenAddress = paramAddresses[0];
		uint tokenAmount = StdDaoToken(tokenAddress).getBalanceAtVoting(votingID, _voter);
		return sqrt(tokenAmount);
	}

	function sqrt(uint x) internal pure returns (uint y) {
		uint z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}	
}
