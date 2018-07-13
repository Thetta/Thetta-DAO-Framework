pragma solidity ^0.4.22;

import './Voting_SimpleToken.sol';

/**
 * @title Voting_Quadratic
 * @dev This is the implementation of IVoting interface. Each Proposal should have voting attached. 
*/
contract Voting_Quadratic is Voting_SimpleToken {

	constructor(IDaoBase _dao, IProposal _proposal, address _origin, uint _minutesToVote, uint _quorumPercent, uint _consensusPercent, address _tokenAddress)public 
			Voting_SimpleToken(_dao, _proposal, _origin, _minutesToVote, _quorumPercent, _consensusPercent, _tokenAddress)
	{
	}


	function _getVotingStats() internal constant returns(uint yesResults, uint noResults, uint votersTotal){
		yesResults = 0;
		noResults = 0;
		votersTotal = stdDaoToken.totalSupply();
		for(uint i=0; i<tokenVotesArray.length; ++i){
			if(tokenVotesArray[i].vote){
				yesResults+= sqrt(tokenVotesArray[i].tokenAmount);
			}else{
				noResults+= sqrt(tokenVotesArray[i].tokenAmount);
			}
		}
		return;
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

