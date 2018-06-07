pragma solidity ^0.4.22;

/**
 * @title IDestination 
 * @dev Keeps all money until flush is called
*/
interface IDestination {
	// pull model
	function flush() external;
	function flushTo(address _to) external;
}

/**
 * @title ISplitter 
 * @dev does not store funds. Splits them between the children
*/
interface ISplitter {
	function getChildrenCount()external view returns(uint);
	function getChild(uint _index)external view returns(address);
	function addChild(address _newChild) external;
}

/**
 * @title IReceiver 
 * @dev Something that needs funds 
*/
interface IReceiver {
	// In case we have absolute output -> will return 0
	// in 1/100th percents of input. Examples:
	// 12 is 0.12% of input; 
	// 100 is 1% of input
	function getPercentsMul100()constant external returns(uint);

	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeedsMoney()constant external returns(bool);

	// WeiReceiver should process all tokens here (hold it or send it somewhere else)
	function processFunds(uint _currentFlow) external payable;

	// non payable!
	function()external;
}

// IWeiReceiver does not store funds!
//
// There are 2 types of Outputs:
// "Absolute": fixed amount of Wei
// "Relative": percents of input 
contract IWeiReceiver is IReceiver {
	// Will calculate only absolute outputs, but not take into account the Percents
	function getMinWeiNeeded()external view returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinWeiNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalWeiNeeded(uint _inputWei)external view returns(uint);
}

// IErc20Receiver does not store funds!
//
// There are 2 types of Outputs:
// "Absolute": fixed amount of Wei
// "Relative": percents of input 
contract IErc20Receiver is IReceiver {
	// Will calculate only absolute outputs, but not take into account the Percents
	function getMinTokensNeeded()external view returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinTokensNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalTokensNeeded(uint _inputTokens)external view returns(uint);
}

/**
 * @title Moneyflow 
*/
interface IMoneyflow {
	// send Ether using 'sendFunds' method here
	function getRevenueEndpoint()external view returns(IWeiReceiver);
	function getDonationEndpoint()external view returns(IWeiReceiver);

	// send Ether using default fallback functions here
	function getRevenueEndpointAddress()external view returns(address);
	function getDonationEndpointAddress()external view returns(address);

	// send all donations to the msg.sender (onlyOwner of this contract)
	function withdrawDonationsTo(address _out)external;

// Receivers
	// usually _receiver is a MoneyFlowScheme 
	// see Schemes.sol for example
	function setRootWeiReceiver(IWeiReceiver _receiver) external;
}



