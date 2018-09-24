pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

import "./PreserveBalancesOnTransferToken.sol";
import "./ITokenVotingSupport.sol";
import "../utils/UtilsLib.sol";


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
 *		mintFor()
 *		burnFor()
 *    startNewVoting()
 *    finishVoting()
 *    getBalanceAtVoting() 
*/
contract StdDaoToken is DetailedERC20, PausableToken, PreserveBalancesOnTransferToken, ITokenVotingSupport {
	uint256 public cap;
	bool isBurnable;
	bool isPausable;

	address[] public holders;
	mapping (address => bool) isHolder;

	modifier isBurnable_() { 
		require (isBurnable); 
		_; 
	}

	modifier isPausable_() { 
		require (isPausable);
		_; 
	}

	event VotingStarted(address indexed _address, uint _votingID);
	event VotingFinished(address indexed _address, uint _votingID);
	
	constructor(string _name, string _symbol, uint8 _decimals, bool _isBurnable, bool _isPausable, uint256 _cap) public
		DetailedERC20(_name, _symbol, _decimals)
	{
		require(_cap > 0);
		cap = _cap;
		isBurnable = _isBurnable;
		isPausable = _isPausable;

		holders.push(this);
	}

// ITokenVotingSupport implementation
	// TODO: VULNERABILITY! no onlyOwner!
	/**
	* @notice This function should be called only when token not paused
	* @return index of the new voting
	* @dev should be called when voting started for conservation balances during this voting
	*/
	function startNewVoting() public whenNotPaused returns(uint) {
		uint idOut = super._startNewEvent();
		emit VotingStarted(msg.sender, idOut);
		return idOut;
	}

	// TODO: VULNERABILITY! no onlyOwner!
	// update balances from conservation after voting finish
	/**
	* @notice This function should be called only when token not paused
	* @param _votingID id of voting
	* @dev update balances from conservation after voting finish
	*/
	function finishVoting(uint _votingID) whenNotPaused public {
		super._finishEvent(_votingID);
		emit VotingFinished(msg.sender, _votingID);
	}

	/**
	* @param _votingID id of voting
	* @param _owner account
	* @return balance of voting for account _owner
	*/
	function getBalanceAtVoting(uint _votingID, address _owner) public view returns (uint256) {
		return super.getBalanceAtEventStart(_votingID, _owner);
	}

	/**
	* @notice This function should be called only when token not paused
	* @param _to address
	* @param _value amount of tokens which will be transfered
	* @return true
	*/
	function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
		if(!isHolder[_to]) {
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transfer(_to, _value);
	}

	// transfer tokens from _from to _to address
	/**
	* @notice This function should be called only when token not paused
	* @param _from address
	* @param _to address
	* @param _value amount of tokens which will be transfered
	* @return true
	*/
	function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
		if(!isHolder[_to]) {
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transferFrom(_from, _to, _value);
	}

	/**
	* @return amount of total voters
	*/
	function getVotingTotalForQuadraticVoting() public view returns(uint) {
		uint votersTotal = 0;
		for(uint k=0; k<holders.length; k++) {
			votersTotal += UtilsLib.sqrt(this.balanceOf(holders[k]));
		}
		return votersTotal;
	}
	
// MintableToken override
	// @dev do not call this method. Instead use mintFor()
	function mint(address _to, uint256 _amount) canMint onlyOwner public returns(bool) {
		revert();
	}

	/**
	* @notice This function should be called only by owner
	* @param _to address
	* @param _amount amount of tokens which will be minted
	* @return true
	*/
	function mintFor(address _to, uint256 _amount) canMint onlyOwner public returns(bool) {
		require(totalSupply_.add(_amount) <= cap);

		if(!isHolder[_to]) {
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.mint(_to, _amount);
	}

// BurnableToken override
	// @dev do not call this method. Instead use burnFor()
	function burn(uint256 _value) public {
		revert();
	}

	/**
	* @notice This function should be called only by owner
	* @param _who address
	* @param _value amount of tokens which will be burned
	*/
	function burnFor(address _who, uint256 _value) isBurnable_ onlyOwner public {
		super._burn(_who, _value);
	}

	// this is an override of PausableToken method
	/**
	* @notice This function should be called only by owner
	* @dev pause the token
	*/
	function pause() isPausable_ onlyOwner public {
		super.pause();
	}

	// this is an override of PausableToken method
	/**
	* @notice This function should be called only by owner
	* @dev unpause the token
	*/
	function unpause() isPausable_ onlyOwner  public {
		super.unpause();
	}
}
