pragma solidity ^0.4.15;

contract IWeiSplitter {
	function getChildrenCount() public constant returns(uint);
	function getChild(uint _index) public constant returns(address);
	function addChild(address _newChild) public;
}
