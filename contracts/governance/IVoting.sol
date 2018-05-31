pragma solidity ^0.4.15;

// The voice input is binary (yes or no only)
// The result is binary (yes or no only)
// Any algorightm inside (1e1v, linear, quadratic, etc)
interface IVoting {
	// _tokenAmount -> if this voting type DOES NOT use tokens -> set to any value (e.g., 0);
	// will execute action automatically if the voting is finished 
	function vote(bool _yes, uint _tokenAmount) public;
	
	// stop the voting
	function cancelVoting() public;

	// This is for statistics
	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults);

	// Is voting finished?
	function isFinished()public constant returns(bool);
	// The result of voting
	function isYes()public constant returns(bool);
}

// for "liquid democracy"
// in this case the delegate does all voting
interface IDelegationTable {
	function delegateMyVoiceTo(address _to, uint _tokenAmount) public;

	function removeDelegation(address _to) public;
}


