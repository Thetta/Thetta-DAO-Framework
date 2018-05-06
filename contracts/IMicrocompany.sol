pragma solidity ^0.4.15;

contract IMicrocompany {
	function isEmployee(address _a)public returns(bool);

	function isCanDo(address _a, string _permissionName)public returns(bool);

	function addNewWeiTask(string _caption, string _desc, bool _isPostpaid, bool _isDonation, uint _neededWei) public;
}
