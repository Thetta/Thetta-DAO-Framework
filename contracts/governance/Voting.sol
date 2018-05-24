pragma solidity ^0.4.15;

import '../IMicrocompany.sol';
import './IVoting.sol';
import './IProposal.sol';

// for Proposals
import '../moneyflow/WeiExpense.sol';
import "../moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Voting is IVoting, Ownable {
	enum VoteType {
		// 1 employee = 1 vote
		EmployeesVote,

		// 1 token = 1 vote
		SimpleTokenVote,

		// quadratic voting
		QuadraticTokenVote
	}

	IDaoBase mc;
	IProposal proposal; 

	VoteType public voteType;
	uint public minutesToVote;
	address public tokenAddress;
	bool isCalled = false;

////////
	mapping (uint=>address) employeesVoted;
	uint employeesVotedCount = 0;
	mapping (address=>bool) votes;

////////
	// we can use _origin instead of tx.origin
	function Voting(IDaoBase _mc, IProposal _proposal, address _origin, 
						VoteType _voteType, uint _minutesToVote, address _tokenAddress){
		mc = _mc;
		proposal = _proposal; 

		voteType = _voteType;	
		minutesToVote = _minutesToVote;
		tokenAddress = _tokenAddress;

		if(voteType==VoteType.EmployeesVote){
			// first vote 
			// TODO: WARNING!!!!!!!! Hard-coded type
			require(mc.isGroupMember("Employees",_origin));
			internalEmployeeVote(_origin, true);
		}else{
			// TODO: initial vote for other types...
		}
	}

	function vote(bool _yes, uint _tokenAmount) public {
		require(!isFinished());

		if(voteType==VoteType.EmployeesVote){
			// TODO: WARNING!!!!!!!! Hard-coded type
			require(mc.isGroupMember("Employees",msg.sender));
			internalEmployeeVote(msg.sender, _yes);
		}

		// if voting is finished -> then call action()
		if(!isCalled && isFinished() && isYes()){
			// should not be callable again!!!
			isCalled = true;

			proposal.action(mc, this);
		}
	}

	function delegateMyVoiceTo(address _to) public {
		// not implemented in this contract
		revert();
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		if(voteType==VoteType.EmployeesVote){
			return employee_getFinalResults();
		}
		return (0,0,0);
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


////// EMPLOYEE type:
	// remember who voted yes or no
	function internalEmployeeVote(address _who, bool _yes) internal {
		// voter can not vote again and change the vote!
		votes[_who] = _yes;

		employeesVoted[employeesVotedCount] = _who;
		employeesVotedCount++;
	}

	function employee_getFinalResults() internal constant returns(uint yesResults, uint noResults, uint totalResults){
		yesResults = 0;
		noResults = 0;
		totalResults = 0;

		// employees could be fired or added IN THE MIDDLE of the voting 
		//
		// so here we should iterate again over all microcompany employees and check if they voted yes or no 
		// each employee has 1 vote 
		for(uint i=0; i<employeesVotedCount; ++i){
			address e = employeesVoted[i];

			// TODO: WARNING!!!!!!!! Hard-coded type
			if(mc.isGroupMember("Employees",e)){
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
