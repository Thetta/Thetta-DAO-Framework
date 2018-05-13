pragma solidity ^0.4.15;

import '../IMicrocompany.sol';
import '../tasks/Tasks.sol';

contract IVote {
	function vote(bool _yes) public;

// These should be implemented in the less abstract contracts like Vote, etc:
	// This is for statistics
	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults);
	// Is voting finished?
	function isFinished()public constant returns(bool);
	// The result of voting
	function isYes()public constant returns(bool);

// PLEASE implement these in your contract:
	function getData()constant public returns(string outType, string desc, string comment);
	function action()public;
}

contract Vote is IVote {
	enum VoteType {
		// 1 employee = 1 vote
		EmployeesVote,

		// 1 token = 1 vote
		SimpleTokenVote,

		// quadratic voting
		QuadraticTokenVote
	}

	IMicrocompany mc;
	VoteType public voteType;
	uint public minutesToVote;
	address public tokenAddress;

////////
	mapping (uint=>address) employeesVoted;
	uint employeesVotedCount = 0;
	mapping (address=>bool) votes;

////////
	// we can use _origin instead of tx.origin
	function Vote(address _mc, address _origin, 
					  VoteType _voteType, uint _minutesToVote, address _tokenAddress){
		mc = IMicrocompany(_mc);
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

	// TODO: count
	function vote(bool _yes) public{
		if(voteType==VoteType.EmployeesVote){
			require(mc.isEmployee(msg.sender));
			internalEmployeeVote(msg.sender, _yes);
		}
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
		// voter can vote again and change the vote!
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
contract VoteAddNewTask is Vote {
  	string caption;
	string desc;
  	bool isPostpaid;
  	bool isDonation; 
	uint neededWei;

	function VoteAddNewTask(address _mc, address _origin,
									string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) 
		// TODO: remove default parameters, let Vote to read data in its constructor
		// each employee has 1 vote 
		Vote(_mc, _origin, VoteType.EmployeesVote, 24 *60, 0x0)
		public 
	{
		caption = _caption;
		desc = _desc;
		isPostpaid = _isPostpaid;
		isDonation = _isDonation;
		neededWei = _neededWei;
	}

// IVote implementation
	function getData()constant public returns(string _outType, string _desc, string _comment){
		return ("AddNewTask","TODO","");
	}

	function action() public {
		// voting should be finished
		require(isFinished());

		// TODO: should not be callable again!!!

		// this is not needed, because Microcompany.isCanDoAction() will check how THIS vote is 
		//if(isYes()){
			// cool! voting is over and the majority said YES -> so let's go!
			IMicrocompany tmp = IMicrocompany(mc);
			WeiTask wt = new WeiTask(mc,caption,desc,isPostpaid,isDonation,neededWei);

			// as long as we call this method from WITHIN the vote contract 
			// isCanDoAction() should return yes if voting finished with Yes result
			tmp.addNewWeiTask(wt);
		//}
	}
}

contract VoteIssueTokens is Vote {
	address to;
	uint amount;

	function VoteIssueTokens(address _mc, address _origin,
									 address _to, uint _amount)
		// TODO: remove default parameters, let Vote to read data in its constructor
		// each employee has 1 vote 
		Vote(_mc, _origin, VoteType.EmployeesVote, 24 *60, 0x0)
		public 
	{
		to = _to; 
		amount = _amount;
	}

// IVote implementation
	function getData()constant public returns(string outType, string desc, string comment){
		// TODO:
		return ("IssueTokens","Issue XXX tokens to YYY address","");
	}

	function action() public {
		// voting should be finished
		require(isFinished());

		// TODO: should not be callable again!!!

		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		IMicrocompany tmp = IMicrocompany(mc);
		tmp.issueTokens(to, amount);
	}
}
