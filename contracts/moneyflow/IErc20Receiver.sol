pragma solidity ^0.4.22;

import "./IReceiver.sol";

// IErc20Receiver does not store funds!
//
// There are 2 types of Outputs:
// "Absolute": fixed amount of Wei
// "Relative": percents of input 
contract IErc20Receiver is IReceiver {
	// Will calculate only absolute outputs, but not take into account the Percents
	function getMinTokensNeeded()public view returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinTokensNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalTokensNeeded(uint _inputTokens)public view returns(uint);
}