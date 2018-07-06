pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title StdDaoToken 
 * @dev Currently DaoBase works only with StdDaoToken. It does not support working with 
 * plain ERC20 tokens because we need some extra features like mint(), burn() and transferOwnership()
 *
 * EVERY token that is used on Thetta should support these operations:
 * ERC20:
 *		balanceOf() 
 *		transfer() 
 *
 * Non ERC20:
 *		transferOwnership()
 *		mint()
 *		burn()
*/
contract StdDaoToken is MintableToken, PausableToken, DetailedERC20 {

	uint256 public cap;
	bool isMintable;
	bool isBurnable;
	bool isPausable;
	bool isVotingPeriod = false;

	mapping (address => uint) public balancesForVotingPeriod;
	

	event Burn(address indexed burner, uint256 value);

	modifier isMintable_() { 
		require (isMintable); 
		_;
	}

	modifier isBurnable_() { 
		require (isBurnable); 
		_; 
	}

	modifier isPausable_() { 
		require (isPausable); 
		_; 
	}
	
	constructor(string _name, string _symbol, uint8 _decimals, bool _isMintable, bool _isBurnable, bool _isPausable, uint256 _cap) public
		DetailedERC20(_name, _symbol, _decimals)
	{
		require(_cap > 0);
		cap = _cap;
		isMintable = _isMintable;
		isBurnable = _isBurnable;
		isPausable = _isPausable;
	}

	function startVoting() public {
		require (!isVotingPeriod);
		isVotingPeriod = true;
	}

	function finishVoting() public {
		require (isVotingPeriod);
		isVotingPeriod = false;
	}
	

	function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[msg.sender]);

		if(!isVotingPeriod){
			balancesForVotingPeriod[msg.sender] = balancesForVotingPeriod[msg.sender].sub(_value);
			balancesForVotingPeriod[_to] = balancesForVotingPeriod[_to].add(_value);
		}

		balances[msg.sender] = balances[msg.sender].sub(_value);
		balances[_to] = balances[_to].add(_value);
		emit Transfer(msg.sender, _to, _value);
		return true;
	}

	function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[_from]);
		require(_value <= allowed[_from][msg.sender]);

		if(!isVotingPeriod){
			balancesForVotingPeriod[_from] = balancesForVotingPeriod[_from].sub(_value);
			balancesForVotingPeriod[_to] = balancesForVotingPeriod[_to].add(_value);
		}

		balances[_from] = balances[_from].sub(_value);
		balances[_to] = balances[_to].add(_value);
		allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
		emit Transfer(_from, _to, _value);
		return true;
	}

	function balanceOfForVotings(address _owner) public view returns (uint256) {
		if(isVotingPeriod){
			return balancesForVotingPeriod[_owner];
		}
		return balances[_owner];
	}

	// this is BurnableToken method
	function burn(address _who, uint256 _value) isBurnable_ onlyOwner public{
		require(_value <= balances[_who]);
		if(!isVotingPeriod){
			balancesForVotingPeriod[_who] = balancesForVotingPeriod[_who].sub(_value);
		}
		balances[_who] = balances[_who].sub(_value);
		totalSupply_ = totalSupply_.sub(_value);
		emit Burn(_who, _value);
		emit Transfer(_who, address(0), _value);
	}

	// this is an override of MintableToken method with cap
	function mint(address _to, uint256 _amount) isMintable_ onlyOwner public returns(bool){
		require(totalSupply_.add(_amount) <= cap);
		if(!isVotingPeriod){
			balancesForVotingPeriod[_to] = balancesForVotingPeriod[_to].add(_amount);
		}
		super.mint(_to, _amount);
		return true;
	}

	// this is an override of PausableToken method
	function pause() isPausable_ onlyOwner public{
		super.pause();
	}

	// this is an override of PausableToken method
	function unpause() isPausable_ onlyOwner  public{
		super.unpause();
	}



}
