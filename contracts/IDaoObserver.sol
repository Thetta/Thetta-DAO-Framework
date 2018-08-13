pragma solidity ^0.4.23;

/**
 * @title IDaoObserver, can be called IDaoClient really.
 * @dev Also, see DaoClient contract below.
 */
contract IDaoObserver {
	function onUpgrade(address _newAddress) public;
}