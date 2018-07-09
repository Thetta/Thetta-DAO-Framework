pragma solidity ^0.4.22;

interface ITokenVotingSupport {
	
	function startNewVoting() external returns(uint);
	function finishVoting(uint _votingID) external;
	function getBalanceAtVoting(uint _votingID, address _owner) external view returns (uint256);
}