pragma solidity ^0.4.22;


/**
 * @title IDestination 
 * @dev Keeps all money until flush is called
*/
contract IDestination {
	// pull model
	function flush() public;
	function flushTo(address _to) public;
}


/**
 * @title ISplitter 
 * @dev does not store funds. Splits them between the children
*/
contract ISplitter {
	function getChildrenCount()public view returns(uint);
	function getChild(uint _index)public view returns(address);
	function addChild(address _newChild) public;

	function open() public;
	function close() public;
	function isOpen() public view returns(bool);
}


/**
 * @title IReceiver 
 * @dev Something that needs funds 
*/
contract IReceiver {
	// In case we have absolute output -> will return 0
	// in 1/100th percents of input. Examples:
	// 12 is 0.12% of input; 
	// 100 is 1% of input
	function getPercentsMul100()view public returns(uint);

	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeedsMoney()view public returns(bool);

	// WeiReceiver should process all tokens here (hold it or send it somewhere else)
	function processFunds(uint _currentFlow) public payable;

	// non payable!
	function()public;
}


// IWeiReceiver does not store funds!
//
// There are 2 types of Outputs:
// "Absolute": fixed amount of Wei
// "Relative": percents of input 
contract IWeiReceiver is IReceiver {
	// Will calculate only absolute outputs, but not take into account the Percents
	function getMinWeiNeeded()public view returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinWeiNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalWeiNeeded(uint _inputWei)public view returns(uint);
}


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


/**
 * @title Moneyflow 
*/
contract IMoneyflow {
	// send Ether using 'sendFunds' method here
	function getRevenueEndpoint()public view returns(IWeiReceiver);
	function getDonationEndpoint()public view returns(IWeiReceiver);

	// send Ether using default fallback functions here
	function getRevenueEndpointAddress()public view returns(address);
	function getDonationEndpointAddress()public view returns(address);

	// send all donations to the msg.sender (onlyOwner of this contract)
	function withdrawDonationsTo(address _out)public;

// Receivers
	// usually _receiver is a MoneyFlowScheme 
	// see Schemes.sol for example
	function setRootWeiReceiver(IWeiReceiver _receiver) public;
}



