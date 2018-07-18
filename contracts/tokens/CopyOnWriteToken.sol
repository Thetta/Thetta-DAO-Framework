pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/token/ERC20/BasicToken.sol";

/**
 * @title Copy-on-Write (CoW) token 
 * @dev Token that can preserve the balances after some EVENT happens (voting is started, didivends are calculated, etc)
 * Please notice that EVENT in this case has nothing to do with Ethereum events.
 *
 * Example of usage (pseudocode):
 *
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
contract CopyOnWriteToken is BasicToken {
	struct Holder {
        uint256 balance;
        uint lastUpdateTime;
    }

	struct Event {
	    mapping (address => Holder) holders;
	    mapping (address => bool) isChanged;
	    
	    bool isEventInProgress;
	    uint eventStartTime;
	}

	mapping (uint => Event) events;

	event EventStarted(address indexed _address, uint _eventID);
	event EventFinished(address indexed _address, uint _eventID);

////
	function startNewEvent() internal returns(uint){
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

	function finishEvent(uint _eventID) internal {
		require(events[_eventID].isEventInProgress);
		events[_eventID].isEventInProgress = false;

		emit EventFinished(msg.sender, _eventID);
	}

	function updateCopyOnWriteMaps(address _from, address _to) internal {
		updateCopyOnWriteMap(_to);
		updateCopyOnWriteMap(_from);
	}

	function updateCopyOnWriteMap(address _for) internal {
		for(uint i = 0; i < 20; i++){
			bool res = isNeedToUpdateBalancesMap(i, _for);
			if(res){
				events[i].holders[_for].balance = balances[_for];
				events[i].isChanged[_for] = true;
				events[i].holders[_for].lastUpdateTime = now;
			}
		}
	}

	function isNeedToUpdateBalancesMap(uint _eventID, address _to) internal returns(bool) {
		return (events[_eventID].isEventInProgress && !events[_eventID].isChanged[_to]) || 
				 (events[_eventID].isEventInProgress && events[_eventID].isChanged[_to] && events[_eventID].holders[_to].lastUpdateTime<events[_eventID].eventStartTime);
	}
	
	function getBalanceAtEventStart(uint _eventID, address _for) internal view returns(uint256) {
		require(events[_eventID].isEventInProgress);
		if(!events[_eventID].isChanged[_for]){
			return balances[_for];
		}
		return events[_eventID].holders[_for].balance;
	}
}
