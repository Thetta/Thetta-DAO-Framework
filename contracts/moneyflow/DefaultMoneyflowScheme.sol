pragma solidity ^0.4.23;

import "./ether/WeiRelativeExpenseWithPeriod.sol";
import "./ether/WeiTopDownSplitter.sol";
import "./ether/WeiUnsortedSplitter.sol";
import "../DaoClient.sol";
import "../IDaoBase.sol";


/**
 * @title FallbackToWeiReceiver
 * @dev This contract should be used to automatically instantiate Default moneyscheme for a DAO.
 * Use it as example. You can setup your own moneyflow.  
 * THIS IS A WORKING example!
 *
 * Layout:
 * 
 * Root - top-down splitter 
 *		Spends - unsorted splitter
 *			Salaries - unsorted splitter 
 *			Other - unsorted splitter 
 *			Tasks - unsorted splitter
 *		Bonuses - unsorted splitter
 *		Rest - unsorted splitter
 *			ReserveFund - fund 
 *			DividendsFund - fund
*/
contract DefaultMoneyflowScheme is DaoClient {
	WeiTopDownSplitter root;

	WeiUnsortedSplitter spends; 
	WeiUnsortedSplitter bonuses; 
	WeiUnsortedSplitter rest; 

	WeiUnsortedSplitter salaries; 
	WeiUnsortedSplitter other; 
	WeiUnsortedSplitter tasks; 

	WeiRelativeExpenseWithPeriod reserveFund;
	WeiRelativeExpenseWithPeriod dividendsFund;

	//bytes32 public ADD_NEW_TASK = keccak256(abi.encodePacked("addNewTask"));
	bytes32 public constant ADD_NEW_TASK = 0xcb9526c69072a622cb86ec3b80cadf28b76991a31d24568cb04f425c246e880c;
	//bytes32 public MODIFY_MONEY_SCHEME = keccak256(abi.encodePacked("modifyMoneyscheme"));
	bytes32 public constant MODIFY_MONEY_SCHEME = 0x14f3b572f5c60a27fbd720a8da3cb69ca244dcb7323e4d5678bbbb5914c4e944;
	//bytes32 public FLUSH_RESERVE_FUND_TO = keccak256(abi.encodePacked("flushReserveFundTo"));
	bytes32 public constant FLUSH_RESERVE_FUND_TO = 0x5f2a319d6055192f7a6f19e5f7e6c637b4f9b6517dc9c9c00e84824a329bd197;

/////
	constructor(
		IDaoBase _daoBase, 
		address _fundOutput, 
		uint _percentsReserve, 
		uint _dividendsReserve) public DaoClient(_daoBase)											  
	{
		require(0x0 != _fundOutput);

		// root = new WeiTopDownSplitter("root");

		// spends = new WeiUnsortedSplitter("spends");
		// bonuses = new WeiUnsortedSplitter("bonuses");
		// rest = new WeiUnsortedSplitter("rest");

		// salaries = new WeiUnsortedSplitter("salaries");
		// other = new WeiUnsortedSplitter("other");
		// tasks = new WeiUnsortedSplitter("tasks");

		// // // use .setPercents() to change 
		// reserveFund = new WeiFund(_fundOutput, true, _percentsReserve);

		// // use .setPercents() to change 
		// dividendsFund = new WeiFund(_fundOutput, true, _dividendsReserve);

		// spends.addChild(salaries);
		// spends.addChild(other);
		// spends.addChild(tasks);

		// // This contract is itself a top down (Root) splitter
		// // just call a 'processFunds(uint _currentFlow)' method and it will
		// root.addChild(spends);
		// root.addChild(bonuses);
		// root.addChild(rest);

		// rest.addChild(reserveFund);
		// rest.addChild(dividendsFund);
	}

	function getRootReceiver() public view returns(IWeiReceiver) {
		return root;
	}

	function deployRoot() public {
		root = new WeiTopDownSplitter("root");
	}

////////////////////////////////////////////////////////////////
	// use MoneyflowAuto to add new task with voting! 
	function addNewTask(IWeiReceiver _wr) view public isCanDo(ADD_NEW_TASK) {
		// 1 - add new task immediately
		//tasks.addChild(_wr);
	}

	// if _employee is not in the flow -> will add new WeiAbsoluteExpense
	// if _employee is already in the flow -> will update the needed amount, i.e. call setNeededWei()
	function setSalaryForEmployee(address _employee, uint _weiPerMonth) view public isCanDo(MODIFY_MONEY_SCHEME) {
		// TODO: is voting required? Move voting to MoneyflowAuto!

		// TODO: implement

		// 0 - check if _employee is employee 
		// TODO: WARNING!!!!!!!! Hard-coded type
		require(daoBase.isGroupMember("Employees", _employee));

		// 1 - employee already added? 

		// 2 - modify or add 
	}

	function setBonusForEmployee(address _employee, uint _bonusPercentsPerMonth) view public isCanDo(MODIFY_MONEY_SCHEME) {
		// TODO: is voting required? Move voting to MoneyflowAuto!

		// TODO: implement
	}

	// to "remove" the spend -> set (_weiPerMonth==0)
	// this method WILL NOT really remove the item!
	function setOtherSpend(string _name, uint _weiPerMonth) view public isCanDo(MODIFY_MONEY_SCHEME) {
		// TODO: is voting required? Move voting to MoneyflowAuto!

		// TODO: implement
	}

	function flushReseveFundTo(address _to) view public isCanDo(FLUSH_RESERVE_FUND_TO) {
		// TODO:
	}

	// TODO: Currently dividens fund is just another type of Reserve fund (because DividendFund is not implemented yet) 
	function flushDividendsFundTo(address _to) view public isCanDo(FLUSH_RESERVE_FUND_TO) {
		// TODO:
	}
}