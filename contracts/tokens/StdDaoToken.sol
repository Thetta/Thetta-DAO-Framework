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

	struct Voting {
	    mapping (address => Voter) voters;
	    mapping (address => bool) isChanged;
	    
	    bool isVotingInProgress;
	    uint votingStartTime;
	}

	mapping (uint => Voting) votings;
	mapping (address => bool) isHolder;

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
			if(!votings[i].isVotingInProgress){
				votings[i].isVotingInProgress = true;
				votings[i].votingStartTime = now;
				emit VotingCreated(msg.sender, i);
				return i;
			}
		}
		revert(); //all slots busy at the moment
	}

	function finishVoting(uint _votingID) public {
		require (votings[_votingID].isVotingInProgress);
		votings[_votingID].isVotingInProgress = false;
	}
	
	function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[msg.sender]);

		for(uint i = 0; i < 20; i++){
			bool res = isNeedToUpdateBalancesMap(i, _to);
			if(res){
				votings[i].voters[_to].balance = balances[_to];
				votings[i].isChanged[_to] = true;
				votings[i].voters[_to].lastUpdateTime = now;
			}
			res = isNeedToUpdateBalancesMap(i, msg.sender);
			if(res){
				votings[i].voters[msg.sender].balance = balances[msg.sender];
				votings[i].isChanged[msg.sender] = true;
				votings[i].voters[msg.sender].lastUpdateTime = now;
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
			bool res = isNeedToUpdateBalancesMap(i, _to);
			if(res){
				votings[i].voters[_to].balance = balances[_to];
				votings[i].isChanged[_to] = true;
				votings[i].voters[_to].lastUpdateTime = now;
			} 
			res = isNeedToUpdateBalancesMap(i, _from); 
			if(res){
				votings[i].voters[_from].balance = balances[_from];
				votings[i].isChanged[_from] = true;
				votings[i].voters[_from].lastUpdateTime = now;
			}
		}
		if(!isHolder[_to]){
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transferFrom(_from, _to, _value);
	}

	function getBalanceAtVoting(uint _votingID, address _owner) public view returns (uint256) {
		require(votings[_votingID].isVotingInProgress);
		if(!votings[_votingID].isChanged[_owner]){
			return balances[_owner];
		}
		return votings[_votingID].voters[_owner].balance;
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
			bool res = isNeedToUpdateBalancesMap(i, _who);
			if(res){
				votings[i].voters[_who].balance = balances[_who];
				votings[i].isChanged[_who] = true;
				votings[i].voters[_who].lastUpdateTime = now;
			}
		}
		super._burn(_who, _value);
	}

	// this is an override of MintableToken method with cap
	function mintFor(address _to, uint256 _amount) canMint onlyOwner public returns(bool){

		require(totalSupply_.add(_amount) <= cap);

		for(uint i = 0; i < 20; i++){
			bool res = isNeedToUpdateBalancesMap(i, _to);
			if(res){
				votings[i].voters[_to].balance = balances[_to];
				votings[i].isChanged[_to] = true;
				votings[i].voters[_to].lastUpdateTime = now;
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

	function isNeedToUpdateBalancesMap(uint _votingID, address _to) internal returns(bool) {
		return (votings[_votingID].isVotingInProgress && !votings[_votingID].isChanged[_to]) || (votings[_votingID].isVotingInProgress && votings[_votingID].isChanged[_to] && votings[_votingID].voters[_to].lastUpdateTime<votings[_votingID].votingStartTime);
	}
	

}
