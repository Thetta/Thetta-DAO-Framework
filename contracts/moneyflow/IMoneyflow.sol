pragma solidity ^0.4.15;

// this contract should keep all money until flush is called
contract IWeiDestination {
	// pull model
	function flush() public;
	function flushTo(address _to) public;
}

contract IWeiSplitter {
	function getChildrenCount() public constant returns(uint);
	function getChild(uint _index) public constant returns(address);
	function addChild(address _newChild) public;
}

// WeiReceiver does not store funds!
//
// There are 2 types of Outputs:
// "Absolute": fixed amount of Wei
// "Relative": percents of input 
contract IWeiReceiver {
	// Will calculate only absolute outputs, but not take into account the Percents
	function getMinWeiNeeded()constant public returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinWeiNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalWeiNeeded(uint _inputWei)constant public returns(uint);
	
	// In case we have absolute output -> will return 0
	// in 1/100th percents of input. Examples:
	// 12 is 0.12% of input; 
	// 100 is 1% of input
	function getPercentsMul100()constant public returns(uint);

	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeedsMoney()constant public returns(bool);

	// non payable!
	function()public;

	// WeiReceiver should process all Wei here (hold it or send it somewhere else)
	function processFunds(uint _currentFlow) public payable;
}

// Easy-to-use wrapper to convert fallback -> processFunds()
// fallback -> processFunds
contract FallbackToWeiReceiver {
	address output = 0x0;

	// _output should be IWeiReceiver
	function FallbackToWeiReceiver(address _output) public {
		output = _output;
	}

	function()public payable{
		IWeiReceiver iwr = IWeiReceiver(output);
		iwr.processFunds.value(msg.value)(msg.value);		
	}
}

contract IMoneyflow {
	// send Ether using 'sendFunds' method here
	function getRevenueEndpoint()public constant returns(IWeiReceiver);
	function getDonationEndpoint()public constant returns(IWeiReceiver);

	// send Ether using default fallback functions here
	function getRevenueEndpointAddress()public constant returns(address);
	function getDonationEndpointAddress()public constant returns(address);

	// send all donations to the msg.sender (onlyOwner of this contract)
	function withdrawDonationsTo(address _out)public;

// Receivers
	// usually _receiver is a MoneyFlowScheme 
	// see Schemes.sol for example
	function setRootWeiReceiver(IWeiReceiver _receiver) public;
}

