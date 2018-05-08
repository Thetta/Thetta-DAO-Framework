pragma solidity ^0.4.15;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

contract StdMicrocompanyToken is MintableToken, DetailedERC20 {
	function StdMicrocompanyToken(string _name, string _symbol, uint8 _decimals) 
		DetailedERC20(_name, _symbol, _decimals) public 
	{

	}
}
