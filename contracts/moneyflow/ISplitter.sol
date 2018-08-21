pragma solidity ^0.4.23;


/**
 * @title ISplitter 
 * @dev does not store funds. Splits them between the children
*/
contract ISplitter {
	function getChildrenCount()public view returns(uint);
	function getChild(uint _index)public view returns(address);
	function addChild(address _newChild) public;

	function open() public;
	function close() public;
	function isOpen() public view returns(bool);
}