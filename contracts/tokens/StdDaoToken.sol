pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "./CopyOnWriteToken.sol";
import "./ITokenVotingSupport.sol";

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
contract StdDaoToken is DetailedERC20, MintableToken, BurnableToken, PausableToken, CopyOnWriteToken, ITokenVotingSupport {
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
	function startNewVoting() onlyOwner public returns(uint) {
		uint idOut = super.startNewEvent();
		emit VotingStarted(msg.sender, idOut);
		return idOut;
	}

	function finishVoting(uint _votingID) onlyOwner public {
		super.finishEvent(_votingID);
		emit VotingFinished(msg.sender, _votingID);
	}

	function getBalanceAtVoting(uint _votingID, address _owner) public view returns (uint256) {
		return super.getBalanceAtEventStart(_votingID, _owner);
	}

// 
	function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[msg.sender]);

		super.updateCopyOnWriteMaps(msg.sender, _to);

		if(!isHolder[_to]){
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transfer(_to, _value);
	}

	function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[_from]);
		require(_value <= allowed[_from][msg.sender]);

		super.updateCopyOnWriteMaps(_from, _to);

		if(!isHolder[_to]){
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transferFrom(_from, _to, _value);
	}

	function getVotingTotalForQuadraticVoting() public view returns(uint){
		uint votersTotal = 0;
		for(uint k=0; k<holders.length; k++){
			votersTotal += sqrt(this.balanceOf(holders[k]));
		}
		return votersTotal;
	}
	
	function burnFor(address _who, uint256 _value) isBurnable_ onlyOwner public{
		super.updateCopyOnWriteMap(_who);
		super._burn(_who, _value);
	}

	// this is an override of MintableToken method with cap
	function mintFor(address _to, uint256 _amount) canMint onlyOwner public returns(bool){
		require(totalSupply_.add(_amount) <= cap);

		super.updateCopyOnWriteMap(_to);

		if(!isHolder[_to]){
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.mint(_to, _amount);
	}

	// this is an override of PausableToken method
	function pause() isPausable_ onlyOwner public{
		super.pause();
	}

	// this is an override of PausableToken method
	function unpause() isPausable_ onlyOwner  public{
		super.unpause();
	}

	function sqrt(uint x) internal pure returns (uint y) {
		uint z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}
}
