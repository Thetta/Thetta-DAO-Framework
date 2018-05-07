pragma solidity ^0.4.15;

import '../IMicrocompany.sol';
import '../tasks/Tasks.sol';

contract Vote {
	enum VoteType {
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
	function Vote(address _mc, VoteType _voteType, uint _minutesToVote, address _tokenAddress){
		mc = _mc;
		voteType = _voteType;	
		minutesToVote = _minutesToVote;
		tokenAddress = _tokenAddress;
	}

	function vote(bool _yes) public{
		// TODO: count
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		// TODO:

		return (0,0,0);
	}

	function isFinished()public returns(bool){
		// TODO:
		// 1 - if minutes elapsed

		// 2 - if voted enough participants

		return false;
	}
}

contract EmployeesVote{
	address mc;
	uint public minutesToVote;

////////
	function EmployeesVote(address _mc, uint _minutesToVote){
		mc = _mc;
		minutesToVote = _minutesToVote;
	}

	function vote(bool _yes) public{
		// TODO: remember who voted yes or no
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		// TODO: count 
		// employees could be fired or added IN THE MIDDLE of the voting 
		//
		// so here we should iterate again over all microcompany employees and check if they voted yes or no 
		// each employee has 1 voice

		return (0,0,0);
	}

	function isFinished()public returns(bool){
		// TODO:
		// 1 - if minutes elapsed

		// 2 - if voted enough participants

		return false;
	}
}

contract AddNewTaskVote is EmployeesVote {
	address mc;
  	string caption;
	string desc;
  	bool isPostpaid;
  	bool isDonation; 
	uint neededWei;

	function AddNewTaskVote(address _mc,
									string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) 
		// each employee has 1 voice
		EmployeesVote(_mc, 24 *60)
		public 
	{
		mc = _mc;
		caption = _caption;
		desc = _desc;
		isPostpaid = _isPostpaid;
		isDonation = _isDonation;
		neededWei = _neededWei;
	}

	function action(bool _results) internal {
		if(_results){
			// please add me to the list!
			IMicrocompany tmp = IMicrocompany(mc);
			WeiTask wt = new WeiTask(mc,caption,desc,isPostpaid,isDonation,neededWei);
			tmp.addNewWeiTask(wt);
		}
	}
}
