pragma solidity ^0.4.23;

import "./IDaoBase.sol";
import "./IDaoObserver.sol";


/**
 * @title DaoClient, just an easy-to-use wrapper.
 * @dev This contract provides you with internal 'daoBase' variable. 
 * Once your DAO controller is upgraded -> all DaoClients will be notified and 'daoBase' var will be updated automatically.
 *
 * Some contracts like Votings or Auto-callers has 'daoBase' variable and don't use DaoClient.
 * In this case they will stop working if the controller (DAO) is upgraded (it is as inteded).
 */
contract DaoClient is IDaoObserver {
	IDaoBase daoBase;

	modifier isCanDo(bytes32 _what) {
		require(daoBase.isCanDoAction(msg.sender, _what)); 
		_; 
	}

	constructor(IDaoBase _daoBase) public {
		daoBase = _daoBase;
		daoBase.addObserver(IDaoObserver(this));
	}

	/**
	 * @dev If your company is upgraded -> then this will automatically update the current daoBase.
	 * daoBase will point at NEW contract!
	 * @param _newAddress New controller.
	 */
	function onUpgrade(address _newAddress) public {
		require(msg.sender == address(daoBase));

		daoBase = IDaoBase(_newAddress);

		// this is not needed because we are already in the list of observers (in the store) 
		// and the controller is upgraded only
		//daoBase.addObserver(this);
	}
}