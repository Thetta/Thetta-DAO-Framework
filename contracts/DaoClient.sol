pragma solidity ^0.4.23;

import "./IDaoBase.sol";
import "./IDaoObserver.sol";

/**
 * @title DaoClient, just an easy-to-use wrapper.
 * @dev This contract provides you with internal 'dao' variable. 
 * Once your DAO controller is upgraded -> all DaoClients will be notified and 'dao' var will be updated automatically.
 *
 * Some contracts like Votings or Auto-callers has 'dao' variable and don't use DaoClient.
 * In this case they will stop working if the controller (DAO) is upgraded (it is as inteded).
 */
contract DaoClient is IDaoObserver {
	IDaoBase dao;

	modifier isCanDo(bytes32 _what) {
		require(dao.isCanDoAction(msg.sender, _what)); 
		_; 
	}

	constructor(IDaoBase _dao) public {
		dao = _dao;
		dao.addObserver(IDaoObserver(this));
	}

	/**
	 * @dev If your company is upgraded -> then this will automatically update the current dao.
	 * dao will point at NEW contract!
	 * @param _newAddress New controller.
	 */
	function onUpgrade(address _newAddress) public {
		require(msg.sender==address(dao));

		dao = IDaoBase(_newAddress);

		// this is not needed because we are already in the list of observers (in the store) 
		// and the controller is upgraded only
		//dao.addObserver(this);
	}
}