pragma solidity ^0.4.23;

import "../DaoClient.sol";
import "../IDaoBase.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract SimpleICO is DaoClient, Ownable {
	using SafeMath for uint256;

	address public tokenAddress;
	uint256 public rate;
	uint256 public weiRaised;
	uint256 public minPurchase;
	uint256 public maxPurchase;
	uint256 public softCap;
	uint256 public hardCap;
	uint256 public startDate;
	uint256 public endDate;
	bool public stopped;
	bool public paused;

	mapping(address => uint256) private deposits;
	mapping(address => bool) private isWhitelisted;

	event Deposited(address indexed payee, uint256 weiAmount);
	event Withdrawn(address indexed payee, uint256 weiAmount);

	event TokenPurchase(
		address indexed purchaser,
		address indexed beneficiary,
		uint256 value,
		uint256 amount
	);

	modifier onlyWhileOpen() {
		require(block.timestamp >= startDate && block.timestamp <= endDate && weiRaised <= hardCap && !stopped);
		_;
	}

	modifier onlyAfterFail() {
		require((block.timestamp >= endDate && weiRaised < softCap) || stopped);
		_;
	}

	modifier onlyAfterSuccess() {
		require(block.timestamp >= endDate && weiRaised >= softCap);
		_;
	}

	modifier whenNotPaused() {
		require(!paused);
		_;
	}

	constructor(
		uint256 _rate, 
		address _tokenAddress, 
		IDaoBase _dao, 
		uint256 _minPurchase, 
		uint256 _maxPurchase, 
		uint256 _startDate, 
		uint256 _endDate, 
		uint256 _softCap, 
		uint256 _hardCap
	) public 
		DaoClient(_dao)
	{
		require(_rate > 0);
		require(_tokenAddress != address(0));
		require(_endDate > block.timestamp);

		rate = _rate;
		tokenAddress = _tokenAddress;
		minPurchase = _minPurchase;
		maxPurchase = _maxPurchase;
		startDate = _startDate;
		endDate = _endDate;
		softCap = _softCap;
		hardCap = _hardCap;
	}

	function () external payable {
		buyTokens(msg.sender);
	}

	/**
	* @notice This function should be called only when ICO open and not paused
	* @param _beneficiary account which gets tokens
	*/
	function buyTokens(address _beneficiary) onlyWhileOpen whenNotPaused public payable {
		require (msg.value >= minPurchase && msg.value <= maxPurchase);
		require (msg.value + weiRaised <= hardCap);
		require(msg.value != 0);

		uint256 weiAmount = msg.value;
		deposits[msg.sender] = deposits[msg.sender].add(weiAmount);
		emit Deposited(msg.sender, weiAmount);

		uint256 tokens = _getTokenAmount(weiAmount);
		weiRaised = weiRaised.add(weiAmount);

		dao.issueTokens(tokenAddress, _beneficiary, tokens);

		emit TokenPurchase(
			msg.sender,
			_beneficiary,
			weiAmount,
			tokens
		);
	}

	/**
	* @notice This function should be called only when ICO open and not paused
	* @param _weiAmount amount of wei sended to the contract
	* @return calculated amount of tokens
	* @dev this function calculates tokens by formula wei amount * rate
	*/
	function _getTokenAmount(uint256 _weiAmount)
		internal view returns (uint256)
	{
		return _weiAmount.mul(rate);
	}

	/**
	* @notice This function should be called only when ICO open and only by owner
	* @dev stops ICO
	*/
	function emergencyStop() onlyOwner onlyWhileOpen public {
		stopped = true;
	}

	/**
	* @notice This function should be called only when ICO open and only by owner
	* @dev pause ICO
	*/
	function pauseICO() onlyOwner whenNotPaused public {
		paused = true;
	}

	/**
	* @notice This function should be called only by owner
	* @dev unpause ICO
	*/
	function unpauseICO() onlyOwner public {
		require(paused);
		paused = false;
	}

	/**
	* @notice This function should be called only by owner
	* @param _addresses array with addresses
	* @param _tokenAmounts array with token amounts related to addresses in _addresses array
	* @dev this function distributes tokens before ICO
	*/
	function distributeBeforeICO(address[] _addresses, uint256[] _tokenAmounts) onlyOwner public {
		require(block.timestamp < startDate);
		require(_addresses.length > 0);
		require(_addresses.length == _tokenAmounts.length);

		for(uint256 i = 0; i < _addresses.length; i++) {
			dao.issueTokens(tokenAddress, _addresses[i], _tokenAmounts[i]);
		}
	}

	/**
	* @notice This function should be called only by owner and only when ICO finished with success
	* @param _addresses array with addresses
	* @param _tokenAmounts array with token amounts related to addresses in _addresses array
	* @dev this function distributes tokens after ICO
	*/
	function distributeAfterICO(address[] _addresses, uint256[] _tokenAmounts) onlyAfterSuccess onlyOwner public {
		require (_addresses.length > 0);
		require (_addresses.length == _tokenAmounts.length);

		for(uint256 i = 0; i < _addresses.length; i++) {
			dao.issueTokens(tokenAddress, _addresses[i], _tokenAmounts[i]);
		}
	}

	/**
	* @notice This function should be called only by owner and only while ICO is open
	* @param _member address
	* @dev this function adds _member to the whitelist
	*/
	function addToWhitelist(address _member) onlyOwner onlyWhileOpen public {
		isWhitelisted[_member] = true;
	}

	/**
	* @param _member address
	* @return true if _member in whitelist
	*/
	function isMemberInWhitelist(address _member) public returns(bool) {
		return isWhitelisted[_member];
	}

	/**
	* @notice This function should be called only by owner and only after ICO finished with success
	* @param _wallet address
	* @dev forward funds from ICO contract to wallet
	*/
	function forwardFunds(address _wallet) onlyAfterSuccess onlyOwner public {
		_wallet.transfer(address(this).balance);
	}

	/**
	* @notice This function should be called only after ICO fail
	* @dev returns money for all investors
	*/
	function refund() onlyAfterFail public {
		uint256 payment = deposits[msg.sender];
		assert(address(this).balance >= payment);

		deposits[msg.sender] = 0;

		msg.sender.transfer(payment);

		emit Withdrawn(msg.sender, payment);
	}
}