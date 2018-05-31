pragma solidity ^0.4.15;

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
	uint genesis;

////////
	bytes32 groupHash;

	mapping (address=>bool) addressVotedAlready;
	address[] employeesVotedYes;
	address[] employeesVotedNo;

////////
	// we can use _origin instead of tx.origin
	function Voting_1p1v(IDaoBase _mc, IProposal _proposal, 
								address _origin, 
								uint _minutesToVote, bytes32 _groupHash, bytes32 _emptyParam) public 
	{
		mc = _mc;
		proposal = _proposal;
		minutesToVote = _minutesToVote;

		groupHash = _groupHash;
		genesis = now;

		internalVote(_origin, true);
	}

	function isFinished()public constant returns(bool){
		// 1 - if minutes elapsed
		if(now - genesis >= minutesToVote * 3600 * 1000){
			return true;
		}

		if(true==finishedWithYes){
			return true;
		}

		//  if voted enough participants
		uint employeesCount = mc.getMembersCountByHash(groupHash);
		var(yesResults, noResults, totalResults) = getFinalResults();
		return (totalResults*2 > employeesCount);
	}

	function isYes()public constant returns(bool){
		if(true==finishedWithYes){
			return true;
		}

		uint employeesCount = mc.getMembersCountByHash(groupHash);
		var(yesResults, noResults, totalResults) = getFinalResults();
		return isFinished()&&(yesResults*2 > totalResults);
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}
	
	function vote(bool _yes, uint _tokenAmount) public {
		require(!isFinished());

		internalVote(msg.sender, _yes);
	}

	function internalVote(address _who, bool _yes) internal {
		require(mc.isGroupMemberByHash(groupHash, _who));

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

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		yesResults = 0;
		noResults = 0;
		totalResults = 0;

		// employees could be fired or added IN THE MIDDLE of the voting
		//
		// so here we should iterate again over all microcompany employees and check if they voted yes or no
		// each employee has 1 vote
		for(uint i=0; i<employeesVotedYes.length; ++i){
			address e = employeesVotedYes[i];

			if(mc.isGroupMemberByHash(groupHash,e)){
				// count this vote
				yesResults++;
				totalResults++;
			}
		}

		for(uint j=0; j<employeesVotedNo.length; ++j){
			address e2 = employeesVotedNo[j];

			if(mc.isGroupMemberByHash(groupHash,e2)){
				// count this vote
				noResults++;
				totalResults++;
			}
		}
	}
}
