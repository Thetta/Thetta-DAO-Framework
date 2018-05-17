pragma solidity ^0.4.15;

import "./WeiSplitter.sol";
import "./WeiExpense.sol";
import "./WeiFund.sol";

import "../governance/Voting.sol";

import "../IMicrocompany.sol";
import "./IMoneyflow.sol";


// this contract should be used to automatically instantiate Default scheme for a microcompany:
//
// Root - top-down splitter 
//		Spends - unsorted splitter
//			Salaries - unsorted splitter 
//			Other - unsorted splitter 
//			Tasks - unsorted splitter
//		Bonuses - unsorted splitter
//		Rest - unsorted splitter
//			ReserveFund - fund 
//			DividendsFund - fund
contract DefaultMoneyflowScheme is IMoneyflowScheme, WeiTopDownSplitter {
	IMicrocompanyBase mc;

	WeiUnsortedSplitter spends; 
	WeiUnsortedSplitter bonuses; 
	WeiUnsortedSplitter rest; 

	WeiUnsortedSplitter salaries; 
	WeiUnsortedSplitter other; 
	WeiUnsortedSplitter tasks; 

	WeiFund reserveFund;
	WeiFund dividendsFund;

   modifier isCanDo(string _what){
		require(mc.isCanDoAction(msg.sender, _what)); 
		_; 
	}

/////
	function DefaultMoneyflowScheme(IMicrocompanyBase _mc, address _fundOutput) public {
		require(0x0!=_fundOutput);

		mc = _mc;

		spends = new WeiUnsortedSplitter("spends");
		bonuses = new WeiUnsortedSplitter("bonuses");
		rest = new WeiUnsortedSplitter("rest");

		salaries = new WeiUnsortedSplitter("salaries");
		other = new WeiUnsortedSplitter("other");
		tasks = new WeiUnsortedSplitter("tasks");

		// Only msg sender can do that
		// 50%
		// use .setPercents() to change 
		reserveFund = new WeiFund(_fundOutput, true, 5000);

		// 50%
		// use .setPercents() to change 
		dividendsFund = new WeiFund(_fundOutput, true, 5000);

		spends.addChild(salaries);
		spends.addChild(other);
		spends.addChild(tasks);

		// This contract is itself a top down (Root) splitter
		// just call a 'processFunds(uint _currentFlow)' method and it will
		this.addChild(spends);
		this.addChild(bonuses);
		this.addChild(rest);

		rest.addChild(reserveFund);
		rest.addChild(dividendsFund);
	}

	function addNewTaskAuto(WeiAbsoluteExpense wt) public returns(address voteOut){
		if(mc.isCanDoAction(msg.sender, "addNewTask")){
			// 1 - add new task immediately
			tasks.addChild(wt);
			return 0x0;
		}else{
			ProposalAddNewTask vant = new ProposalAddNewTask(mc, this, msg.sender, wt);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			mc.addNewProposal(vant);
			return vant;
		}
	}

	/*
	// commented because no direct access to elements are allowed 
   // 
	function getElement(string _name) public returns(address){
		if(keccak256(_name)==keccak256("tasks")){
			return address(tasks);
		}
	}
  */
}
