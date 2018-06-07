pragma solidity ^0.4.22;

import "./Manageable.sol";

/**
 * @title Pausable
 * @author https://github.com/jibrelnetwork/jibrel-contracts
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 * @dev Based on zeppelin's Pausable, but integrated with Manageable
 * @dev Contract is in paused state by default and should be explicitly unlocked
 */
contract Pausable is Manageable {
// Fields:
     bool paused = true;

// Events:
     event PauseEvent();
     event UnpauseEvent();

// Modifiers:
     modifier whenContractNotPaused() {
          require(paused == false);
          _;
     }

     modifier whenContractPaused {
          require(paused == true);
          _;
     }

// Methods:
     /**
      * @dev called by the manager to pause, triggers stopped state
     */
     function pauseContract() public onlyAllowedManager('pause_contract') whenContractNotPaused {
          paused = true;
          PauseEvent();
     }

     /**
      * @dev called by the manager to unpause, returns to normal state
     */
     function unpauseContract() public onlyAllowedManager('unpause_contract') whenContractPaused {
          paused = false;
          UnpauseEvent();
     }

     /**
      * @dev The getter for "paused" contract variable
     */
     function getPaused() constant public returns (bool) {
          return paused;
     }
}
