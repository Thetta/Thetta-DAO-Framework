pragma solidity ^0.4.22;

interface ITokenVotingSupport {
	
	function startNewVoting() public returns(uint);
	function finishVoting(uint _votingID) public;
	function getBalanceAtVoting(uint _votingID, address _owner) public view returns (uint256);
}