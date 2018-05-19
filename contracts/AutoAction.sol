pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./governance/Voting.sol";
import "./moneyflow/WeiExpense.sol";
import "./moneyflow/IMoneyflow.sol";

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
		ms.addNewTask(wt);
	}

	function getVoting()public constant returns(address){
		return address(voting);
	}
}


////////////////////
// This contract is a helper that will create new Proposal (i.e. voting) if the action is not allowed directly
contract AutoMicrocompanyActionCaller {
	IMicrocompanyBase mc;

	function AutoMicrocompanyActionCaller(IMicrocompanyBase _mc)public{
		mc = _mc;
	}

	function issueTokensAuto(address _to, uint _amount) public returns(address voteOut){
		// 1 - create new task immediately?
		if(mc.isCanDoAction(msg.sender, "issueTokens")){
			mc.issueTokens(_to, _amount);
			return 0x0;
		}else{
			// 2 - create new vote instead
			// we pass msg.sender (just like tx.origin) 
			ProposalIssueTokens pit = new ProposalIssueTokens(mc, msg.sender, _to, _amount);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			mc.addNewProposal(pit);		
			return pit;
		}
	}
}

// TODO: add tests!
contract AutoMoneyflowActionCaller {
	IMicrocompanyBase mc;
	IMoneyflowScheme mfs;

	function AutoMoneyflowActionCaller(IMicrocompanyBase _mc, IMoneyflowScheme _mfs){
		mc = _mc;
		mfs = _mfs;
	}

	function addNewTask(WeiAbsoluteExpense wt) public returns(address voteOut){
		if(mc.isCanDoAction(msg.sender, "addNewTask")){
			// 1 - add new task immediately
			mfs.addNewTask(wt);
			return 0x0;
		}else{
			ProposalAddNewTask vant = new ProposalAddNewTask(mc, mfs, msg.sender, wt);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			mc.addNewProposal(vant);
			return vant;
		}
	}
}
