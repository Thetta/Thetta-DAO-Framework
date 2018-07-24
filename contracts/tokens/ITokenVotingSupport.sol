pragma solidity ^0.4.22;

/**
 * @title ITokenVotingSupport 
 * @dev Token that supports this interface will not lock token transfers if voting is started.
 * Instead, it will preserve balances automatically.
 *
 * Example of usage:
 *
 *	  contract StdDaoToken {}; 
 *   StdDaoToken token;
 *
 *	  token.mintFor(ADDRESS_A, 100);
 *   assert.equal(token.balanceOf(ADDRESS_A), 100);
 *   assert.equal(token.balanceOf(ADDRESS_B), 0);
 *
 *   uint  votingID_1 = token.startVoting();
 *	  token.transfer(ADDRESS_A, ADDRESS_B, 30);
 *
 *	  assert.equal(token.balanceOf(ADDRESS_A), 70);
 *	  assert.equal(token.balanceOf(ADDRESS_B), 30);
 *
 *	  assert.equal(token.getBalanceAtVoting(votingID_1, ADDRESS_A), 100);
 *	  assert.equal(token.getBalanceAtVoting(votingID_1, ADDRESS_B), 0);
*/
interface ITokenVotingSupport {
	// can throw if 20 votings are already started
	function startNewVoting(address _voting) external returns(uint);

	function finishVoting(uint _votingID) external;

	function getBalanceAtVoting(uint _votingID, address _owner) external view returns (uint256);
}

