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
	mapping (address => bool) isHolder;

	mapping (uint => address[]) updates;
	mapping (uint => uint) numElements;
	
	mapping (uint => bool) isVotingInProgress;
	mapping (uint => mapping (address => uint256)) balancesAtVoting;

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
				emit VotingCreated(msg.sender, i);
				return i;
			}
		}
		revert(); //all slots busy at the moment
	}

	function finishVoting(uint _votingID) public {
		require (isVotingInProgress[_votingID]);
		isVotingInProgress[_votingID] = false;

		require (numElements[_votingID] == updates[_votingID].length);

		for(uint i = 0; i <= numElements[_votingID]; i++){
			if(numElements[i] == updates[_votingID].length) {
					updates[_votingID].length += 1;
			}
			balancesAtVoting[_votingID][updates[_votingID][i]] = balances[updates[_votingID][i]];
		}

		clearUpdates(_votingID);
	}

	function clearUpdates(uint _votingID) internal {
    	numElements[_votingID] = 0;
	}
	
	function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
		require(_to != address(0));
		require(_value <= balances[msg.sender]);

		for(uint i = 0; i < 20; i++){
			if(!isVotingInProgress[i]){
				balancesAtVoting[i][msg.sender] = balancesAtVoting[i][msg.sender].sub(_value);
				balancesAtVoting[i][_to] = balancesAtVoting[i][_to].add(_value);
			} else {
				if(numElements[i] == updates[i].length) {
					updates[i].length += 2;
				}
				updates[i][numElements[i]] = _to;
				numElements[i] = numElements[i].add(1);
				updates[i][numElements[i]] = msg.sender;
				numElements[i] = numElements[i].add(1);
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
			if(!isVotingInProgress[i]){
				balancesAtVoting[i][_from] = balancesAtVoting[i][_from].sub(_value);
				balancesAtVoting[i][_to] = balancesAtVoting[i][_to].add(_value);
			} else {
				if(numElements[i] == updates[i].length) {
					updates[i].length += 2;
				}
				updates[i][numElements[i]] = _to;
				numElements[i] = numElements[i].add(1);
				updates[i][numElements[i]] = _from;
				numElements[i] = numElements[i].add(1);
			}
		}
		if(!isHolder[_to]){
			holders.push(_to);
			isHolder[_to] = true;
		}
		return super.transferFrom(_from, _to, _value);
	}

	function getBalanceAtVoting(uint _votingID, address _owner) public view returns (uint256) {
		return balancesAtVoting[_votingID][_owner];
	}


	function getVotingTotalForQuadraticVoting() public view returns(uint){
		uint votersTotal = 0;
		for(uint k=0; k<holders.length; k++){
			votersTotal += sqrt(this.balanceOf(holders[k]));
		}
		return votersTotal;
	}
	
	function burnFor(address _who, uint256 _value) isBurnable_ onlyOwner public{
		super._burn(_who, _value);

		for(uint i = 0; i < 20; i++){
			if(!isVotingInProgress[i]){
				balancesAtVoting[i][_who] = balancesAtVoting[i][_who].sub(_value);
			}else {
				if(numElements[i] == updates[i].length) {
					updates[i].length += 1;
				}
				updates[i][numElements[i]] = _who;
				numElements[i] = numElements[i].add(1);
			}
		}
	}

	// this is an override of MintableToken method with cap
	function mintFor(address _to, uint256 _amount) canMint onlyOwner public returns(bool){

		require(totalSupply_.add(_amount) <= cap);

		for(uint i = 0; i < 20; i++){
			if(!isVotingInProgress[i]){
				balancesAtVoting[i][_to] = balancesAtVoting[i][_to].add(_amount);
			}else {
				if(numElements[i] == updates[i].length) {
					updates[i].length += 1;
				}
				updates[i][numElements[i]] = _to;
				numElements[i] = numElements[i].add(1);
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
