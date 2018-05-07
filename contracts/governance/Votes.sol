pragma solidity ^0.4.15;

import '../IMicrocompany.sol';
import '../tasks/Tasks.sol';

contract IVote {
	function vote(bool _yes) public;

	// This is for statistics
	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults);
	// Is voting finished?
	function isFinished()public constant returns(bool);
	// The result of voting
	function isYes()public constant returns(bool);

	//
	// PLEASE override in your contract
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

	address mc;
	VoteType public voteType;
	uint public minutesToVote;
	address public tokenAddress;

////////
	mapping (uint=>address) employeesVoted;
	uint employeesVotedCount = 0;
	mapping (address=>bool) votes;

////////
	function Vote(address _mc, VoteType _voteType, uint _minutesToVote, address _tokenAddress){
		mc = _mc;
		voteType = _voteType;	
		minutesToVote = _minutesToVote;
		tokenAddress = _tokenAddress;
	}

	// TODO: count
	function vote(bool _yes) public{
		if(voteType==VoteType.EmployeesVote){
			employee_vote(_yes);
		}
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		if(voteType==VoteType.EmployeesVote){
			return employee_getFinalResults();
		}
		return (0,0,0);
	}

	function isFinished()public constant returns(bool){
		// TODO:
		// 1 - if minutes elapsed

		// 2 - if voted enough participants

		return false;
	}

	function isYes()public constant returns(bool){
		// WARNING: this line is commented, so will not check if voting is finished!
		//if(!isFinished(){return false;}

		var(yesResults, noResults, totalResults) = getFinalResults();

		// TODO: calculate results

		return false;
	}

////// EMPLOYEE type:
	// remember who voted yes or no
	function employee_vote(bool _yes) internal {
		IMicrocompany tmp = IMicrocompany(mc);
		require(tmp.isEmployee(msg.sender));

		// voter can vote again and change the vote!
		votes[msg.sender] = _yes;

		employeesVoted[employeesVotedCount] = msg.sender;
		employeesVotedCount++;
	}

	function employee_getFinalResults() internal constant returns(uint yesResults, uint noResults, uint totalResults){
		IMicrocompany tmp = IMicrocompany(mc);
		yesResults = 0;
		noResults = 0;
		totalResults = 0;

		// employees could be fired or added IN THE MIDDLE of the voting 
		//
		// so here we should iterate again over all microcompany employees and check if they voted yes or no 
		// each employee has 1 vote 
		for(uint i=0; i<employeesVotedCount; ++i){
			address e = employeesVoted[i];
			if(tmp.isEmployee(e)){
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
contract AddNewTaskVote is Vote {
	address mc;
  	string caption;
	string desc;
  	bool isPostpaid;
  	bool isDonation; 
	uint neededWei;

	function AddNewTaskVote(address _mc,
									string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) 
		// each employee has 1 vote 
		Vote(_mc, VoteType.EmployeesVote, 24 *60, 0x0)
		public 
	{
		mc = _mc;
		caption = _caption;
		desc = _desc;
		isPostpaid = _isPostpaid;
		isDonation = _isDonation;
		neededWei = _neededWei;
	}

	function action() public {
		// voting should be finished
		require(isFinished());

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
