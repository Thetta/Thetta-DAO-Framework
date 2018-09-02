pragma solidity ^0.4.23;


/**
 * @title IDaoObserver
 * @dev Adds upgradeabilty to the contracts. Used by the DaoClient 
 */
contract IDaoObserver {
	function onUpgrade(address _newAddress) public;
}
