pragma solidity ^0.4.21;

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
	bool finishedWithYes = false;
	uint64 genesis;
	uint public quorumPercent;
	uint public consensusPercent;
	bytes32 public emptyParam;

////////
	string public groupName;

	mapping (address=>bool) addressVotedAlready;
	address[] employeesVotedYes;
	address[] employeesVotedNo;

////////
	// we can use _origin instead of tx.origin
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, bytes32 _emptyParam) public 
	{
		// require((_quorumPercent<=100)&&(_quorumPercent>0));
		// require((_consensusPercent<=100)&&(_consensusPercent>0));
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
		// 1 - if minutes elapsed
		if(minutesToVote>0){
			if((uint64(now) - genesis) < (minutesToVote * 60 * 1000)){
				return false;
			}else{
				return true;
			}
		}
	   
		if(finishedWithYes){
			return true;
		}

		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = _getFinalResults();
		uint votesSum = yesResults + noResults;

		

		// if enough participants voted
		return ((votesSum * 100) >= votersTotal * quorumPercent);
	}

	function isYes()external view returns(bool){
		return _isYes();
	}

	function _isYes()internal view returns(bool){
		if(true==finishedWithYes){
			return true;
		}

		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = _getFinalResults();
		uint votesSum = yesResults + noResults;

		return _isFinished() && 
		       (yesResults * 100 >= (yesResults + noResults)*consensusPercent) && 
		       ((votesSum * 100) >= votersTotal * quorumPercent); // quorumTest if time passed, isFinished==true, but no quorum => isYes==false 
	}

	function cancelVoting() external onlyOwner {
		// TODO:
	}

	event Voting1p1v_vote(uint _votersTotal, uint votesSum);
	
	function vote(bool _yes, uint _tokenAmount) external {
		require(!_isFinished());
		
		if(_tokenAmount){
			revert();
		}

		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;


		(yesResults, noResults, votersTotal) = _getFinalResults();
		uint votesSum = yesResults + noResults;

		emit Voting1p1v_vote(votersTotal, votesSum);

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

	function getFinalResults() external constant returns(uint yesResults, uint noResults, uint votersTotal){
		return _getFinalResults();
	}

	function _getFinalResults() internal constant returns(uint yesResults, uint noResults, uint votersTotal){
		yesResults = filterResults(employeesVotedYes);
		noResults = filterResults(employeesVotedNo);
		votersTotal = dao.getMembersCount(groupName);
		return;	
	}	
}
