pragma solidity ^0.4.22;

/**
 * @title IVoting 
 * @dev The input is binary (yes or no only)
 * The result is binary (yes or no only)
 * Any algorightm inside (1p1v, linear, quadratic, etc)
*/
contract IVoting {
	// _tokenAmount -> if this voting type DOES NOT use tokens -> set to any value (e.g., 0);
	// will execute action automatically if the voting is finished 
	function vote(bool _isYes) public;

	// stop the voting
	function cancelVoting() public;

	// This is for statistics
	// Can get this stats if voting is finished. 
	// Can get this stats if voting is NOT finished. 
	function getVotingStats() public view returns(uint yesResults, uint noResults, uint totalResults);

	// Is voting finished?
	//
	// 1 - First we check if minutesToVote!=0 and time elapsed 
	// 2 - If not, then we check if at least one of this conditions be met:
	//		2.1 - is already finished with yes 
	//		2.2 - is quorum reached
	//
	// When isFinished():
	// 1 - i can not vote any more
	// 2 - i can get results with isYes()
	function isFinished()public view returns(bool);

	// The result of voting
	// 
	// At least one of these conditions should be met:
	// 1 - time elapsed 
	// 2 - all these conditions should be met:
	//		2.1 - isFinished() 
	//		2.2 - is quorum reached 
	function isYes()public view returns(bool);
}

// for "liquid democracy"
// in this case the delegate does all voting
contract IDelegationTable {
	function delegateMyVoiceTo(address _to, uint _tokenAmount) public;
	function removeDelegation(address _to) public;
}


