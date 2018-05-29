pragma solidity ^0.4.15;

import '../IDaoBase.sol';

import './IVoting.sol';
import './IProposal.sol';

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Voting is IVoting {
	IDaoBase mc;
	IProposal proposal; 
	bool isCalled = false;
	uint public minutesToVote;

	event Voting_CallAction();

	function Voting(IDaoBase _mc, IProposal _proposal, uint _minutesToVote){
		mc = _mc;
		proposal = _proposal;
		minutesToVote = _minutesToVote;
	}

	function callActionIfEnded() public {
		if(!isCalled && isFinished() && isYes()){
			emit Voting_CallAction();

			// should not be callable again!!!
			isCalled = true;

			// can throw!
			proposal.action(mc, this);
		}
	}

	function isYes()public constant returns(bool){
		// WARNING: this line is commented, so will not check if voting is finished!
		//if(!isFinished(){return false;}
		var(yesResults, noResults, totalResults) = getFinalResults();

		// TODO: calculate results
		// TODO: JUST FOR DEBUGGGGG!!!
		return (yesResults > totalResults/2) && (totalResults>1);
	}

	// TODO: out of GAS!!!
	function isFinished() public constant returns(bool){
		// 1 - if minutes elapsed

		// 2 - if voted enough participants
		//if((mc.getEmployeesCount()/2) < employeesVotedCount){
	   //		return true;
		//}

		// TODO: JUST FOR DEBUGGGGG!!!
		var(yesResults, noResults, totalResults) = getFinalResults();
		return (totalResults>1);
	}
}

// 1 person - 1 vote
contract Voting_1p1v is Voting, Ownable {
////////
	bytes32 groupHash;

	mapping (uint=>address) employeesVoted;
	uint employeesVotedCount = 0;
	mapping (address=>bool) votes;

////////
	// we can use _origin instead of tx.origin
	function Voting_1p1v(IDaoBase _mc, IProposal _proposal, 
								address _origin, 
								uint _minutesToVote, bytes32 _groupHash, bytes32 _emptyParam)
								public Voting(_mc, _proposal, _minutesToVote){
		groupHash = _groupHash;

		// the caller must be a member of the group!
		require(mc.isGroupMemberByHash(groupHash,_origin));

		internalVote(_origin, true);
	}
	
	function vote(bool _yes, uint _tokenAmount) public {
		// require(!isFinished());

		// require(mc.isGroupMemberByHash(groupHash,msg.sender));

		internalVote(msg.sender, _yes);
	}

	function internalVote(address _who, bool _yes) internal {
		employeesVoted[employeesVotedCount] = _who;
		employeesVotedCount++;

		votes[_who] = _yes;

		callActionIfEnded();
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		yesResults = 0;
		noResults = 0;
		totalResults = 0;

		// employees could be fired or added IN THE MIDDLE of the voting 
		//
		// so here we should iterate again over all microcompany employees and check if they voted yes or no 
		// each employee has 1 vote 
		for(uint i=0; i<employeesVotedCount; ++i){
			address e = employeesVoted[i];

			if(mc.isGroupMemberByHash(groupHash,e)){
				// count this vote
				if(votes[e]){
					yesResults++;
				}else{
					noResults++;
				}
				totalResults++;
			}
		}
	}
}

// TODO: disable token transfers?
contract Voting_SimpleToken is Voting, Ownable {
	address public tokenAddress;

////////
	mapping (address=>bool) votes;

////////
	// we can use _origin instead of tx.origin
	function Voting_SimpleToken(IDaoBase _mc, IProposal _proposal, address _origin, 
						uint _minutesToVote, address _tokenAddress, bytes32 _emptyParam)
						public Voting(_mc, _proposal, _minutesToVote)
	{
		tokenAddress = address(_tokenAddress);

		// TODO: get the balance!!!
		uint tokenAmount = 0;

		internalVote(_origin, true, tokenAmount);
	}

	function vote(bool _yes, uint _tokenAmount) public {
		require(!isFinished());

		internalVote(msg.sender, _yes, _tokenAmount);
	}

	function internalVote(address _who, bool _yes, uint _tokenAmount) internal {
		// TODO: 

		// votes[_who] = _yes;
		
		callActionIfEnded();
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		yesResults = 0;
		noResults = 0;
		totalResults = 0;

		// TODO: 
	}
}
