pragma solidity ^0.4.22;

import '../IDaoBase.sol';

import './IVoting.sol';
import './IProposal.sol';

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";

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
	uint public quorumPercent;
	uint public consensusPercent;
	bool public isQuadraticVoting;
	ERC20Basic erc20Token;

	mapping (address=>bool) addressVotedAlready;

	struct TokenVote{
		address voter;
		bool vote;
		uint tokenAmount;
	}

	TokenVote[] tokenVotesArray;

	event  VotingSimpleToken_Vote(address _who, bool _yes, uint _tokenAmount);
	event  VotingSimpleToken_CallAction();

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
		erc20Token = ERC20Basic(_tokenAddress);
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

		return  _isFinished() &&
		   _isQuorumReached() &&
		_isConsensusReached();
	}

	function cancelVoting() external onlyOwner {
		// TODO:
	}

	function vote(bool _yes, uint _tokenAmount) external {
		require(!_isFinished());
		require(0==_tokenAmount);

		internalVote(msg.sender, _yes);
	}

	function internalVote(address _who, bool _yes) internal {
		uint tokenBalance = erc20Token.balanceOf(_who);

		require(!addressVotedAlready[_who]);

		tokenVotesArray.push(TokenVote(_who, _yes, tokenBalance));
		addressVotedAlready[_who] = true;

		emit VotingSimpleToken_Vote(_who, _yes, tokenBalance);

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
			emit VotingSimpleToken_CallAction();
			proposal.action();
		}
	}

	function getVotingStats() external constant returns(uint yesResults, uint noResults, uint votersTotal){
		return _getVotingStats();
	}

	function _getVotingStats() internal constant returns(uint yesResults, uint noResults, uint votersTotal){
		yesResults = 0;
		noResults = 0;
		votersTotal = erc20Token.totalSupply();
		if(isQuadraticVoting){
			for(uint i=0; i<tokenVotesArray.length; ++i){
				if(tokenVotesArray[i].vote){
					yesResults+= sqrt(tokenVotesArray[i].tokenAmount);
				}else{
					noResults+= sqrt(tokenVotesArray[i].tokenAmount);
				}
			}
		} else {
			for(uint j=0; j<tokenVotesArray.length; ++j){
				if(tokenVotesArray[j].vote){
					yesResults+= tokenVotesArray[j].tokenAmount;
				}else{
					noResults+= tokenVotesArray[j].tokenAmount;
				}
			}
		}
		return;
	}

	function sqrt(uint x) internal returns (uint y) {
		uint z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}
}
