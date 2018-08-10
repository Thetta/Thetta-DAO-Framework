pragma solidity ^0.4.23;

import "./DefaultMoneyflowScheme.sol";

// TODO:
contract DefaultMoneyflowSchemeWithUnpackers is DefaultMoneyflowScheme {
	constructor(
			IDaoBase _dao, 
			address _fundOutput, 
			uint _percentsReserve, 
			uint _dividendsReserve) public 
		DefaultMoneyflowScheme(_dao,_fundOutput,_percentsReserve,_dividendsReserve)
	{

	}

	function addNewTaskGeneric(bytes32[] _params) view public {
		IWeiReceiver _iwr = IWeiReceiver(address(_params[0]));
		addNewTask(_iwr);
	}

	// TODO: add unpackers for all methods of the Scheme
}
