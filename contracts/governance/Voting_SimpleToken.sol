pragma solidity ^0.4.22;

import '../IDaoBase.sol';

import './IVoting.sol';
import './IProposal.sol';
import '../tokens/StdDaoToken.sol';

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Voting_SimpleToken 
 * @dev This is the implementation of IVoting interface. Each Proposal should have voting attached. 
 * If group members change -> it will not work
*/
contract Voting_SimpleToken is IVoting, Ownable {
	// use DaoClient instead?
	// (it will handle upgrades)
	IDaoBase dao;
	IProposal proposal; 

	uint public minutesToVote;
	bool finishedWithYes;
	uint64 genesis;
	address origin;
	uint public quorumPercent;
	uint public consensusPercent;
	uint public votingID;
	bool public isQuadraticVoting;
	StdDaoToken stdDaoToken;

	mapping (uint => mapping(address=>bool)) addressVotedAlready;

	struct TokenVote{
		address voter;
		bool vote;
		uint tokenAmount;
	}

	mapping (uint => TokenVote[]) tokenVotesArray;

	event  VotingSimpleToken_Vote(address _who, bool _yes, uint _tokenAmount);
	event  VotingSimpleToken_CallAction();
	event  VotingStarted(address indexed _address, uint _votingID);

	/**
	 * TODO: 
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _tokenAddress - address of token what uses for voting
	*/

	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote,
		uint _quorumPercent, uint _consensusPercent, address _tokenAddress, bool _isQuadraticVoting) public 
	{
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));

		dao = _dao;
		proposal = _proposal;
		minutesToVote = _minutesToVote;
		quorumPercent = _quorumPercent;
		consensusPercent = _consensusPercent;
		isQuadraticVoting = _isQuadraticVoting;
		stdDaoToken = StdDaoToken(_tokenAddress);

		genesis = uint64(now);
	}

	function isFinished(uint _votingID)public view returns(bool){
		if(minutesToVote!=0){
			return _isTimeElapsed();
		}

		if(finishedWithYes){
			return true;
		}

		return _isQuorumReached(_votingID);
	}

	function _isTimeElapsed() internal view returns(bool){
		if(minutesToVote==0){
			return false;
		}

		return (uint64(now) - genesis) >= (minutesToVote * 60 * 1000);
	}

	function _isQuorumReached(uint _votingID) internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = getVotingStats(_votingID);
		return ((yesResults + noResults) * 100) >= (votersTotal * quorumPercent);
	}

	function _isConsensusReached(uint _votingID) internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = getVotingStats(_votingID);
		return (yesResults * 100) >= ((yesResults + noResults) * consensusPercent);
	}

	function isYes(uint _votingID)public view returns(bool){
		if(true==finishedWithYes){
			return true;
		}

		return  isFinished(_votingID) &&
		   _isQuorumReached(_votingID) &&
		_isConsensusReached(_votingID);
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}

	function startNewVoting() public onlyOwner returns(uint){
		votingID = stdDaoToken.startNewVoting();
		emit VotingStarted(msg.sender, votingID);
		internalVote(msg.sender, true, votingID);
		return votingID;
	}

	function finishVoting(uint _votingID) public onlyOwner {
		stdDaoToken.finishVoting(_votingID);
	}
	

	function vote(bool _yes, uint _tokenAmount, uint _votingID) public {
		require(!isFinished(_votingID));
		require(0==_tokenAmount);

		internalVote(msg.sender, _yes, _votingID);
	}

	function internalVote(address _who, bool _yes, uint _votingID) internal {
		uint tokenBalance = stdDaoToken.getBalanceAtVoting(_votingID, _who);

		require(!addressVotedAlready[_votingID][_who]);

		tokenVotesArray[_votingID].push(TokenVote(_who, _yes, tokenBalance));
		addressVotedAlready[_votingID][_who] = true;

		emit VotingSimpleToken_Vote(_who, _yes, tokenBalance);

		callActionIfEnded(_votingID);
	}

	function callActionIfEnded(uint _votingID) public {
		if(!finishedWithYes && isFinished(_votingID) && isYes(_votingID)){
			// should not be callable again!!!
			finishedWithYes = true;

			// can throw!
			emit VotingSimpleToken_CallAction();
			proposal.action();
		}
	}

	function getVotingStats(uint _votingID) public constant returns(uint yesResults, uint noResults, uint votersTotal){
		yesResults = 0;
		noResults = 0;
		if(isQuadraticVoting){
			votersTotal = stdDaoToken.getVotingTotalForQuadraticVoting();
			for(uint i=0; i<tokenVotesArray[_votingID].length; ++i){
				if(tokenVotesArray[_votingID][i].vote){
					yesResults+= sqrt(tokenVotesArray[_votingID][i].tokenAmount);
				}else{
					noResults+= sqrt(tokenVotesArray[_votingID][i].tokenAmount);
				}
			}
		} else {
			votersTotal = stdDaoToken.totalSupply();
			for(uint j=0; j<tokenVotesArray[_votingID].length; ++j){
				if(tokenVotesArray[_votingID][j].vote){
					yesResults+= tokenVotesArray[_votingID][j].tokenAmount;
				}else{
					noResults+= tokenVotesArray[_votingID][j].tokenAmount;
				}
			}
		}
		return;
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
