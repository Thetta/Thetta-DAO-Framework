pragma solidity ^0.4.15;

import "./WeiSplitter.sol";
import "./WeiExpense.sol";
import "./WeiFund.sol";

import "../governance/Voting.sol";
import "../AutoAction.sol";

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
contract DefaultMoneyflowScheme is IMoneyflowScheme, MicrocompanyUser, WeiTopDownSplitter {
	WeiUnsortedSplitter spends; 
	WeiUnsortedSplitter bonuses; 
	WeiUnsortedSplitter rest; 

	WeiUnsortedSplitter salaries; 
	WeiUnsortedSplitter other; 
	WeiUnsortedSplitter tasks; 

	WeiFund reserveFund;
	WeiFund dividendsFund;

/////
	function DefaultMoneyflowScheme(IMicrocompanyBase _mc, address _fundOutput, 
											  uint _percentsReserve, uint _dividendsReserve) public 
		MicrocompanyUser(_mc)											  
	{
		require(0x0!=_fundOutput);

		spends = new WeiUnsortedSplitter("spends");
		bonuses = new WeiUnsortedSplitter("bonuses");
		rest = new WeiUnsortedSplitter("rest");

		salaries = new WeiUnsortedSplitter("salaries");
		other = new WeiUnsortedSplitter("other");
		tasks = new WeiUnsortedSplitter("tasks");

		// use .setPercents() to change 
		reserveFund = new WeiFund(_fundOutput, true, _percentsReserve);

		// use .setPercents() to change 
		dividendsFund = new WeiFund(_fundOutput, true, _dividendsReserve);

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

	// use AutoMoneyflowActionCaller to add new task with voting! 
	function addNewTask(WeiAbsoluteExpense wt) public isCanDo("addNewTask") {
		// 1 - add new task immediately
		tasks.addChild(wt);
	}

	// if _employee is not in the flow -> will add new WeiAbsoluteExpense
	// if _employee is already in the flow -> will update the needed amount, i.e. call setNeededWei()
	function setSalaryForEmployee(address _employee, uint _weiPerMonth) public isCanDo("modifyMoneyscheme") {
		// TODO: is voting required? Move voting to AutoMoneyflowActionCaller!

		// TODO: implement

		// 0 - check if _employee is employee 
		// TODO: WARNING!!!!!!!! Hard-coded type
		require(mc.isGroupMember("Employees", _employee));

		// 1 - employee already added? 

		// 2 - modify or add 
	}

	function setBonusForEmployee(address _employee, uint _bonusPercentsPerMonth) public isCanDo("modifyMoneyscheme") {
		// TODO: is voting required? Move voting to AutoMoneyflowActionCaller!

		// TODO: implement
	}

	// to "remove" the spend -> set (_weiPerMonth==0)
	// this method WILL NOT really remove the item!
	function setOtherSpend(string _name, uint _weiPerMonth) public isCanDo("modifyMoneyscheme") {
		// TODO: is voting required? Move voting to AutoMoneyflowActionCaller!

		// TODO: implement
	}
}

contract DefaultMoneyflowSchemeWithUnpackers is DefaultMoneyflowScheme {
	function DefaultMoneyflowSchemeWithUnpackers(
			IMicrocompanyBase _mc, 
			address _fundOutput, 
			uint _percentsReserve, 
			uint _dividendsReserve) public 
		DefaultMoneyflowScheme(_mc,_fundOutput,_percentsReserve,_dividendsReserve)
	{

	}

	function addNewTaskGeneric(bytes32[] _params) public {
		WeiAbsoluteExpense _wae = WeiAbsoluteExpense(address(_params[0]));
		addNewTask(_wae);
	}
}
