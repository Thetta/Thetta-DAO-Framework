pragma solidity ^0.4.15;

interface IVoting {
	// _tokenAmount -> if this voting type DOES NOT require tokens -> set to any value (e.g., 0);
	// will execute action if the voting is finished 
	function vote(bool _yes, uint _tokenAmount) public;

	function delegateMyVoiceTo(address _to) public;

	function cancelVoting() public;

	// This is for statistics
	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults);
	// Is voting finished?
	function isFinished()public constant returns(bool);
	// The result of voting
	function isYes()public constant returns(bool);
}
