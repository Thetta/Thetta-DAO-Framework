pragma solidity ^0.4.15;

contract IVoting {
	// will execute action if the voting is finished 
	function vote(bool _yes) public;

	function cancelVoting() public;

// These should be implemented in the less abstract contracts like Voting, etc:
	// This is for statistics
	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults);
	// Is voting finished?
	function isFinished()public constant returns(bool);
	// The result of voting
	function isYes()public constant returns(bool);
}
