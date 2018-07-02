pragma solidity ^0.4.22;

/**
 * @title IVoting 
 * @dev The input is binary (yes or no only)
 * The result is binary (yes or no only)
 * Any algorightm inside (1p1v, linear, quadratic, etc)
*/
interface IVoting {
	// _tokenAmount -> if this voting type DOES NOT use tokens -> set to any value (e.g., 0);
	// will execute action automatically if the voting is finished 
	function vote(bool _yes, uint _tokenAmount) external;

	// stop the voting
	function cancelVoting() external;

	// This is for statistics
	// Can get this stats if voting is finished. 
	// Can get this stats if voting is NOT finished. 
	function getVotingStats() external view returns(uint yesResults, uint noResults, uint totalResults);

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
	function isFinished()external view returns(bool);

	// The result of voting
	// 
	// At least one of these conditions should be met:
	// 1 - time elapsed 
	// 2 - all these conditions should be met:
	//		2.1 - isFinished() 
	//		2.2 - is quorum reached 
	function isYes()external view returns(bool);
}

// for "liquid democracy"
// in this case the delegate does all voting
interface IDelegationTable {
	function delegateMyVoiceTo(address _to, uint _tokenAmount) external;
	function removeDelegation(address _to) external;
}


