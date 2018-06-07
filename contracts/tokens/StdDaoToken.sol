pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

// Currently DaoBase works only with StdDaoToken. It does not support working with 
// plain ERC20 tokens because we need some extra features like mint(), burn() and transferOwnership()
//
// EVERY token that is used on Thetta should support these operations:
// ERC20:
//		balanceOf() 
//		transfer() 
//
// Non ERC20:
//		transferOwnership()
//		mint()
//		burn()
contract StdDaoToken is MintableToken, BurnableToken, DetailedERC20 {
	event Burn(address indexed burner, uint256 value);

	constructor(string _name, string _symbol, uint8 _decimals) public
		DetailedERC20(_name, _symbol, _decimals)
	{
	}

	function burn(address _who, uint256 _value) public {
		require(_value <= balances[_who]);
		// no need to require value <= totalSupply, since that would imply the
		// sender's balance is greater than the totalSupply, which *should* be an assertion failure

		balances[_who] = balances[_who].sub(_value);
		totalSupply_ = totalSupply_.sub(_value);
		emit Burn(_who, _value);
		emit Transfer(_who, address(0), _value);
	}
}
