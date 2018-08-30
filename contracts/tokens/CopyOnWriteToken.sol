pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";


/**
 * @title Copy-on-Write (CoW) token 
 * @dev Token that can preserve the balances after some EVENT happens (voting is started, didivends are calculated, etc)
 * without blocking the transfers!
 *
 * Please notice that EVENT in this case has nothing to do with Ethereum events.
 *
 * Example of usage (pseudocode):
 *	  token.mintFor(ADDRESS_A, 100);
 *   assert.equal(token.balanceOf(ADDRESS_A), 100);
 *   assert.equal(token.balanceOf(ADDRESS_B), 0);
 *
 *   uint someEventID_1 = token.startEvent();
 *	  token.transfer(ADDRESS_A, ADDRESS_B, 30);
 *
 *	  assert.equal(token.balanceOf(ADDRESS_A), 70);
 *	  assert.equal(token.balanceOf(ADDRESS_B), 30);
 *
 *	  assert.equal(token.getBalanceAtEvent(someEventID_1, ADDRESS_A), 100);
 *	  assert.equal(token.getBalanceAtEvent(someEventID_1, ADDRESS_B), 0);
*/
contract CopyOnWriteToken is MintableToken, BurnableToken {
	struct Holder {
		uint256 balance;
		uint lastUpdateTime;
	}

	struct Event {
		mapping (address => Holder) holders;
		
		bool isEventInProgress;
		uint eventStartTime;
	}

	mapping (uint => Event) events;

	event EventStarted(address indexed _address, uint _eventID);
	event EventFinished(address indexed _address, uint _eventID);

	// ERC20 interface overrides
	/**
	* @notice This function should be called only when token not paused
	* @param _to address
	* @param _value amount of tokens which will be transfered
	* @return true
	*/
	function transfer(address _to, uint256 _value) public returns (bool) {
		updateCopyOnWriteMaps(msg.sender, _to);
		return super.transfer(_to, _value);
	}

	/**
	* @notice This function should be called only when token not paused
	* @param _from address
	* @param _to address
	* @param _value amount of tokens which will be transfered
	* @return true
	*/
	function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
		updateCopyOnWriteMaps(_from, _to);
		return super.transferFrom(_from, _to, _value);
	}

	// MintableToken override
	/**
	* @notice This function should be called only by owner
	* @param _to address
	* @param _amount amount of tokens which will be minted
	* @return true
	*/
	function mint(address _to, uint256 _amount) canMint onlyOwner public returns(bool) {
		updateCopyOnWriteMap(_to);
		return super.mint(_to, _amount);
	}

// BurnableToken override
	// @dev This is an override of internal method! public method burn() calls _burn() automatically
	// (see BurnableToken implementation)
	/**
	* @notice This function should be called only by owner
	* @param _who address
	* @param _value amount of tokens which will be burned
	*/
	function _burn(address _who, uint256 _value) internal {
		updateCopyOnWriteMap(_who);
		super._burn(_who, _value);
	}

//// 
	// TODO: onlyOwner!
	/**
	* @return index of the new event
	* @dev should be called when new voting created
	*/
	function startNewEvent() public returns(uint) {
		for(uint i = 0; i < 20; i++) {
			if(!events[i].isEventInProgress) {
				events[i].isEventInProgress = true;
				events[i].eventStartTime = block.timestamp;

				emit EventStarted(msg.sender, i);
				return i;
			}
		}
		revert(); //all slots busy at the moment
	}

	// TODO: onlyOwner!
	/**
	* @dev should be called when voting finished and dont need slot anymore
	*/
	function finishEvent(uint _eventID) public {
		require(events[_eventID].isEventInProgress);
		events[_eventID].isEventInProgress = false;

		emit EventFinished(msg.sender, _eventID);
	}
	
	/**
	* @param _eventID id of voting
	* @param _for account
	* @return balance for account _for before starting voting
	*/
	function getBalanceAtEventStart(uint _eventID, address _for) public view returns(uint256) {
		require(events[_eventID].isEventInProgress);

		if(!isBalanceWasChangedAfterEventStarted(_eventID, _for)) {
			return balances[_for];
		}

		return events[_eventID].holders[_for].balance;
	}

// Internal methods:
	/**
	* @param _from account
	* @param _to account
	* @dev updates balances of the accounts before transfer
	*/
	function updateCopyOnWriteMaps(address _from, address _to) internal {
		updateCopyOnWriteMap(_to);
		updateCopyOnWriteMap(_from);
	}

	/**
	* @param _for account
	* @dev updates balances of the accounts before transfer
	*/
	function updateCopyOnWriteMap(address _for) internal {
		for(uint i = 0; i < 20; i++) {
			bool res = isNeedToUpdateBalancesMap(i, _for);
			if(res) {
				events[i].holders[_for].balance = balances[_for];
				events[i].holders[_for].lastUpdateTime = block.timestamp;
			}
		}
	}

	/**
	* @param _eventID event(voting) id
	* @param _for account
	* @return true if balances map needs to be updated, when balances changed after voting started
	*/
	function isNeedToUpdateBalancesMap(uint _eventID, address _for) internal returns(bool) {
		return events[_eventID].isEventInProgress && !isBalanceWasChangedAfterEventStarted(_eventID, _for);
	}

	/**
	* @param _eventID event(voting) id
	* @param _for account
	* @return true if balances changed after voting started
	*/
	function isBalanceWasChangedAfterEventStarted(uint _eventID, address _for) internal view returns(bool) {
		return (events[_eventID].holders[_for].lastUpdateTime >= events[_eventID].eventStartTime);
	}
}
