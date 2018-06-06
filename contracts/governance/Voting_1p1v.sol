pragma solidity ^0.4.21;

import '../IDaoBase.sol';

import './IVoting.sol';
import './IProposal.sol';

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// Anton's implementation  + Kirill's updates
// If group members change -> it will not work
contract Voting_1p1v is IVoting, Ownable {
	IDaoBase mc;
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
	constructor(IDaoBase _mc, IProposal _proposal, 
		address _origin, uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, bytes32 _emptyParam) public 
	{
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));
		mc = _mc;
		proposal = _proposal;
		minutesToVote = _minutesToVote;
		groupName = _groupName;
		quorumPercent = _quorumPercent;
		consensusPercent = _consensusPercent;
		emptyParam = _emptyParam;
		genesis = uint64(now);

		internalVote(_origin, true);
	}

	function bytes32ToUint(bytes32 data) internal pure returns (uint) {
		return uint(uint16(data[0]) + uint16(data[1]));
	}	

	event Voting1p1v_IsFinished(uint _votersTotal, uint votesSum);

	function getEPasUint()public constant returns(uint){
		return bytes32ToUint(emptyParam);
	}

	function isFinished()public constant returns(bool){
		// 1 - if minutes elapsed
		if((uint64(now) - genesis) < (minutesToVote * 60 * 1000)){
			return false;
		}
	   
		if(finishedWithYes){
			return true;
		}

		uint votersTotal = mc.getMembersCount(groupName);

		uint yesResults = 0;
		uint noResults = 0;
		uint votesSum = 0;
		(yesResults, noResults, votesSum) = getFinalResults();

		emit Voting1p1v_IsFinished(votersTotal, votesSum);

		// if enough participants voted
		return ((votesSum * 100) >= votersTotal * quorumPercent);
	}

	function isYes()public constant returns(bool){
		if(true==finishedWithYes){
			return true;
		}

		uint yesResults = 0;
		uint noResults = 0;
		uint votesSum = 0;
		(yesResults, noResults, votesSum) = getFinalResults();
		return isFinished() && (yesResults * 100 >= (yesResults + noResults)*consensusPercent);
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}
	
	function vote(bool _yes, uint _tokenAmount) public {
		require(!isFinished());

		internalVote(msg.sender, _yes);
	}

	function internalVote(address _who, bool _yes) internal {
		require(mc.isGroupMember(groupName, _who));

		require(!addressVotedAlready[_who]);

		if(_yes){
			employeesVotedYes.push(_who);
		}else{
			employeesVotedNo.push(_who);
		}

		addressVotedAlready[_who] = true;

		callActionIfEnded();
	}

	function callActionIfEnded() public {
		if(!finishedWithYes && isFinished() && isYes()){ 
			// should not be callable again!!!
			finishedWithYes = true;

			// can throw!
			proposal.action(mc, this);
		}
	}

	function filterResults(address[] _votersTotal) internal constant returns(uint){
		uint votedCount = 0;

		for(uint i=0; i<_votersTotal.length; ++i){
			if(mc.isGroupMember(groupName,_votersTotal[i])){
				// count this vote
				votedCount++;
			}
		}
		return votedCount;
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint votesSum){
		yesResults = filterResults(employeesVotedYes);
		noResults = filterResults(employeesVotedNo);
		votesSum = yesResults + noResults;
		return;
	}
}
