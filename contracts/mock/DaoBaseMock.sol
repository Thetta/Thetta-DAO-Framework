pragma solidity ^0.4.22;

import "../DaoStorage.sol";
import "../DaoBase.sol";


contract DaoBaseMock is DaoBase {

	constructor(DaoStorage _daoStorage) public 
		DaoBase(_daoStorage)
	{
	}

	// mock 
	function isCanDoAction(address _a, bytes32 _permissionNameHash) public view returns(bool) {
		return true;
	}
}


