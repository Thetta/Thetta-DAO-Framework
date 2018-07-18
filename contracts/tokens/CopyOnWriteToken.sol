pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

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
contract CopyOnWriteToken is StandardToken {
	struct Holder {
        uint256 balance;
        uint lastUpdateTime;
    }

	struct Event {
	    mapping (address => Holder) holders;
	    //mapping (address => bool) isChanged;
	    
	    bool isEventInProgress;
	    uint eventStartTime;
	}

	mapping (uint => Event) events;

	event EventStarted(address indexed _address, uint _eventID);
	event EventFinished(address indexed _address, uint _eventID);

// ERC20 interface overrides
	function transfer(address _to, uint256 _value) public returns (bool) {
		updateCopyOnWriteMaps(msg.sender, _to);
		return super.transfer(_to, _value);
	}

	function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
		updateCopyOnWriteMaps(_from, _to);
		return super.transferFrom(_from, _to, _value);
	}

//// 
	// TODO: onlyOwner!
	function startNewEvent() public returns(uint){
		for(uint i = 0; i < 20; i++){
			if(!events[i].isEventInProgress){
				events[i].isEventInProgress = true;
				events[i].eventStartTime = now;

				emit EventStarted(msg.sender, i);
				return i;
			}
		}
		revert(); //all slots busy at the moment
	}

	// TODO: onlyOwner!
	function finishEvent(uint _eventID) public {
		require(events[_eventID].isEventInProgress);
		events[_eventID].isEventInProgress = false;

		emit EventFinished(msg.sender, _eventID);
	}
	
	function getBalanceAtEventStart(uint _eventID, address _for) public view returns(uint256) {
		require(events[_eventID].isEventInProgress);

		if(!isBalanceWasChangedAfterEventStarted(_eventID, _for)){
			return balances[_for];
		}

		return events[_eventID].holders[_for].balance;
	}

/////
	function updateCopyOnWriteMaps(address _from, address _to) internal {
		updateCopyOnWriteMap(_to);
		updateCopyOnWriteMap(_from);
	}

	function updateCopyOnWriteMap(address _for) internal {
		for(uint i = 0; i < 20; i++){
			bool res = isNeedToUpdateBalancesMap(i, _for);
			if(res){
				events[i].holders[_for].balance = balances[_for];
				//events[i].isChanged[_for] = true;
				events[i].holders[_for].lastUpdateTime = now;
			}
		}
	}

	function isNeedToUpdateBalancesMap(uint _eventID, address _for) internal returns(bool) {
		// TODO: write test to check if this optimization is valid

		/*
		return (events[_eventID].isEventInProgress && !events[_eventID].isChanged[_for]) || 
				 (events[_eventID].isEventInProgress && events[_eventID].isChanged[_for] && events[_eventID].holders[_for].lastUpdateTime<events[_eventID].eventStartTime);
		*/

		return events[_eventID].isEventInProgress && !isBalanceWasChangedAfterEventStarted(_eventID, _for);
	}

	function isBalanceWasChangedAfterEventStarted(uint _eventID, address _for) internal view returns(bool){
		//return events[_eventID].isChanged[_for];
		return (events[_eventID].holders[_for].lastUpdateTime >= events[_eventID].eventStartTime);
	}
}


/**
 * @title CopyOnWriteTokenTestable
 * @dev Should not be used for production code. Only for tests!
*/
contract CopyOnWriteTokenTestable is CopyOnWriteToken {
	// Not using "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol" to reduce includes
	function mintFor(address _to, uint _amount) public {
		super.updateCopyOnWriteMap(_to);

		totalSupply_ = totalSupply_.add(_amount);
		balances[_to] = balances[_to].add(_amount);
	}
}
