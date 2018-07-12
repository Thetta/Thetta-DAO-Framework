pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
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
contract StdDaoToken is MintableToken, BurnableToken, PausableToken, ITokenVotingSupport, DetailedERC20 {
	uint256 public cap;
	bool isBurnable;
	bool isPausable;
	bool isVotingPeriod = false;
	address[] public holders;

	struct Voter {
        uint256 balance;
        uint lastUpdateTime;
    }

	mapping (address => bool) isHolder;
	mapping (address => bool) isChanged;
	mapping (uint => mapping (address => Voter)) voters;
	
	mapping (uint => bool) isVotingInProgress;
	mapping (uint => uint) votingStartTime;

	event VotingCreated(address indexed _address, uint _votingID);

	modifier isBurnable_() { 
		require (isBurnable); 
		_; 
	}

	modifier isPausable_() { 
		require (isPausable);
		_; 
	}
	
	constructor(string _name, string _symbol, uint8 _decimals, bool _isBurnable, bool _isPausable, uint256 _cap) public
		DetailedERC20(_name, _symbol, _decimals)
	{
		require(_cap > 0);
		cap = _cap;
		isBurnable = _isBurnable;
		isPausable = _isPausable;
		holders.push(this);
	}

	function startNewVoting() public returns(uint) {
		for(uint i = 0; i < 20; i++){
			if(!isVotingInProgress[i]){
				isVotingInProgress[i] = true;
				votingStartTime[i] = now;
				emit VotingCreated(msg.sender, i);
				return i;
			}
		}
		revert(); //all slots busy at the moment
	}

	function finishVoting(uint _votingID) public {
		require (isVotingInProgress[_votingID]);
		isVotingInProgress[_votingID] = false;
	}
	
	function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[msg.sender]);

		for(uint i = 0; i < 20; i++){
			if((isVotingInProgress[i] && !isChanged[_to]) || (isVotingInProgress[i] && isChanged[_to] && voters[i][_to].lastUpdateTime<votingStartTime[i])){
				voters[i][_to].balance = balances[_to];
				isChanged[_to] = true;
				voters[i][_to].lastUpdateTime = now;
			} 
			if((isVotingInProgress[i] && !isChanged[msg.sender]) || (isVotingInProgress[i] && isChanged[msg.sender] && voters[i][msg.sender].lastUpdateTime<votingStartTime[i])){
				voters[i][msg.sender].balance = balances[msg.sender];
				isChanged[msg.sender] = true;
				voters[i][msg.sender].lastUpdateTime = now;
			}
		}
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

		for(uint i = 0; i < 20; i++){
			if((isVotingInProgress[i] && !isChanged[_to]) || (isVotingInProgress[i] && isChanged[_to] && voters[i][_to].lastUpdateTime<votingStartTime[i])){
				voters[i][_to].balance = balances[_to];
				isChanged[_to] = true;
				voters[i][_from].lastUpdateTime = now;
			} 
			if((isVotingInProgress[i] && !isChanged[_from]) || (isVotingInProgress[i] && isChanged[_from] && voters[i][_from].lastUpdateTime<votingStartTime[i])){
				voters[i][_from].balance = balances[_from];
				isChanged[_from] = true;
				voters[i][_from].lastUpdateTime = now;
			}
		}
		if(!isHolder[_to]){
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transferFrom(_from, _to, _value);
	}

	function getBalanceAtVoting(uint _votingID, address _owner) public view returns (uint256) {
		require(isVotingInProgress[_votingID]);
		if(!isChanged[_owner]){
			return balances[_owner];
		}
		return voters[_votingID][_owner].balance;
	}


	function getVotingTotalForQuadraticVoting() public view returns(uint){
		uint votersTotal = 0;
		for(uint k=0; k<holders.length; k++){
			votersTotal += sqrt(this.balanceOf(holders[k]));
		}
		return votersTotal;
	}
	
	function burnFor(address _who, uint256 _value) isBurnable_ onlyOwner public{

		for(uint i = 0; i < 20; i++){
			if((isVotingInProgress[i] && !isChanged[_who]) || (isVotingInProgress[i] && isChanged[_who] && voters[i][_who].lastUpdateTime<votingStartTime[i])){
				voters[i][_who].balance = balances[_who];
				isChanged[_who] = true;
				voters[i][_who].lastUpdateTime = now;
			} 
		}
		super._burn(_who, _value);
	}

	// this is an override of MintableToken method with cap
	function mintFor(address _to, uint256 _amount) canMint onlyOwner public returns(bool){

		require(totalSupply_.add(_amount) <= cap);

		for(uint i = 0; i < 20; i++){
			if((isVotingInProgress[i] && !isChanged[_to]) || (isVotingInProgress[i] && isChanged[_to] && voters[i][_to].lastUpdateTime<votingStartTime[i])){
				voters[i][_to].balance = balances[_to];
				isChanged[_to] = true;
				voters[i][_to].lastUpdateTime = now;
			} 
		}
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
