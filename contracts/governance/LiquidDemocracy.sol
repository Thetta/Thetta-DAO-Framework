pragma solidity ^0.4.22;

import './IVoting.sol';

import "../tokens/StdDaoToken.sol";


// TODO:
contract DelegationTable is IDelegationTable {

	StdDaoToken public votingToken;

	struct Delegator {
		mapping (address => uint) tokensForVotingFromAddress;
		mapping (address => bool) isDelegatedForFrom;
		mapping (address => bool) isDelegatedFor;
		uint delegatorsAmount;
		uint delegatedForAmount;
		uint tokensForVoting;
		bool isDelegatedFor;
		bool isDelegator;
	}	

	mapping (address => Delegator) delegations;

	constructor(address _votingToken){
		votingToken = _votingToken;
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) external {
		require (_to!= address(0));
		require (_tokenAmount >= votingToken.balanceOf(msg.sender));

		delegations[_to].tokensForVoting += _tokenAmount;
		delegations[_to].tokensForVotingFromAddress[msg.sender] += _tokenAmount;
		delegations[_to].delegatorsAmount += 1;
		delegations[_to].isDelegatedFor = true;
		delegations[_to].isDelegatedForFrom[msg.sender] = true;
		delegations[msg.sender].tokensForVoting += _tokenAmount;
		delegations[msg.sender].isDelegator = true;
		delegations[msg.sender].isDelegatorFor[_to] = true;
		delegations[msg.sender].delegatedForAmount += 1;
	}

	function removeDelegation(address _to) external {
		require (_to!= address(0));
		require (delegations[_to].isDelegatedForFrom[msg.sender]);
		require (delegations[msg.sender].isDelegatorFor[_to]);

		delegations[_to].tokensForVoting -= delegations[_to].tokensForVotingFromAddress[msg.sender];
		delegations[msg.sender].tokensForVoting -= delegations[_to].tokensForVotingFromAddress[msg.sender];
		delegations[_to].tokensForVotingFromAddress[msg.sender] = 0;
		delegations[_to].isDelegatedForFrom[msg.sender] = false;
		delegations[msg.sender].isDelegatorFor[_to] = false;
		delegations[_to].delegatorsAmount -= 1;
		delegations[msg.sender].delegatedForAmount -= 1;
		if(delegations[_to].delegatorsAmount == 0){
			delegations[_to].isDelegatedFor = false;
		}
		if(delegations[msg.sender].delegatedForAmount == 0){
			delegations[_to].isDelegator = false;
		}
	}
	
}

// TODO:
contract LiquidVoting is IVoting {

}
