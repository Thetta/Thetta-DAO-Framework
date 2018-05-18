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

	IMicrocompanyBase mc;
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
	function Voting(IMicrocompanyBase _mc, IProposal _proposal, address _origin, 
						VoteType _voteType, uint _minutesToVote, address _tokenAddress){
		mc = _mc;
		proposal = _proposal; 

		voteType = _voteType;	
		minutesToVote = _minutesToVote;
		tokenAddress = _tokenAddress;

		if(voteType==VoteType.EmployeesVote){
			// first vote 
			require(mc.isEmployee(_origin));
			internalEmployeeVote(_origin, true);
		}else{
			// TODO: initial vote for other types...
		}
	}

	function vote(bool _yes) public {
		require(!isFinished());

		if(voteType==VoteType.EmployeesVote){
			require(mc.isEmployee(msg.sender));
			internalEmployeeVote(msg.sender, _yes);
		}

		// if voting is finished -> then call action()
		if(!isCalled && isFinished() && isYes()){
			// should not be callable again!!!
			isCalled = true;

			proposal.action(mc, this);
		}
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
			if(mc.isEmployee(e)){
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

////////////////////// 
//////////////////////
contract ProposalAddNewTask is IProposal {
	IMoneyflowScheme ms;
	Voting voting;
	WeiAbsoluteExpense wt;

	function ProposalAddNewTask(IMicrocompanyBase _mc, IMoneyflowScheme _ms, address _origin,
									WeiAbsoluteExpense _wt) public 
	{
		ms = _ms;

		// TODO: remove default parameters, let Vote to read data in its constructor
		// each employee has 1 vote 
		voting = new Voting(_mc, this, _origin, Voting.VoteType.EmployeesVote, 24 *60, 0x0);

		wt = _wt;
	}

// IVoting implementation
	function action(IMicrocompanyBase _mc, IVoting _voting) public {
		// cool! voting is over and the majority said YES -> so let's go!
		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		ms.addNewTaskAuto(wt);
	}

	function getVoting()public constant returns(address){
		return address(voting);
	}
}

contract ProposalIssueTokens is IProposal {
	Voting voting;
	address to;
	uint amount;

	function ProposalIssueTokens(IMicrocompanyBase _mc, address _origin,
										address _to, uint _amount) public 
	{
		// TODO: remove default parameters, let Voting to read data in its constructor
		// each employee has 1 vote 
		voting = new Voting(_mc, this, _origin, Voting.VoteType.EmployeesVote, 24 *60, 0x0);

		to = _to; 
		amount = _amount;
	}

// IProposal implementation
	// should be called from Voting
	function action(IMicrocompanyBase _mc, IVoting _voting) public {
		require(msg.sender==address(voting));

		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		_mc.issueTokens(to, amount);
	}

	function getVoting()public constant returns(address){
		return address(voting);
	}
}
