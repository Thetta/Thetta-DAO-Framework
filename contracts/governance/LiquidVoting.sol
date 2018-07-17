pragma solidity ^0.4.22;

import './IVoting.sol';

import "../tokens/StdDaoToken.sol";

import "./Voting_SimpleToken.sol";



contract DelegationTable is IDelegationTable, Voting_SimpleToken {

	struct Delegator {
		mapping (address => uint) tokensForVotingFromAddress; // check delegated tokens from concret address (for deleting delegation)
		mapping (address => bool) isDelegatedForFrom; // check if for account was delegated any from this address
		mapping (address => bool) isDelegatorFor; // check if account delegate any for this address
		uint delegatorsAmount; // amount of delegators which delegated any tokens for this address
		uint delegatedForAmount; // amount of delegations which this address have done
		uint tokensForVoting; // tokens which was delegated for address
		uint blockedTokensForVoting; // tokens which account delegated for other addresses
		bool isDelegatedFor; // true if someone delegated tokens for this account
		bool isDelegator; // true if this account delegated any tokens for someone
	}	

	event DelegatedTo(address _sender, uint _blocked);
	event DelegationRemoved(address _sender, uint _tokensAmount);

	mapping (address => Delegator) delegations;
	

	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote,
		uint _quorumPercent, uint _consensusPercent, address _tokenAddress, bool _isQuadraticVoting) public
		Voting_SimpleToken(_dao, _proposal, 
			_origin, _minutesToVote, _quorumPercent, _consensusPercent, _tokenAddress, _isQuadraticVoting)
	{
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) external {
		require (_to!= address(0));
		require (_tokenAmount >= stdDaoToken.balanceOf(msg.sender));

		delegations[_to].tokensForVoting += _tokenAmount;
		delegations[_to].tokensForVotingFromAddress[msg.sender] += _tokenAmount;
		delegations[_to].delegatorsAmount += 1;
		delegations[_to].isDelegatedFor = true;
		delegations[_to].isDelegatedForFrom[msg.sender] = true;
		delegations[msg.sender].blockedTokensForVoting += _tokenAmount;
		emit DelegatedTo(msg.sender, _tokenAmount);
		delegations[msg.sender].isDelegator = true;
		delegations[msg.sender].isDelegatorFor[_to] = true;
		delegations[msg.sender].delegatedForAmount += 1;
	}

	function removeDelegation(address _to) external {
		require (_to!= address(0));
		require (delegations[_to].isDelegatedForFrom[msg.sender]);
		require (delegations[msg.sender].isDelegatorFor[_to]);

		delegations[_to].tokensForVoting -= delegations[_to].tokensForVotingFromAddress[msg.sender];
		delegations[msg.sender].blockedTokensForVoting -= delegations[_to].tokensForVotingFromAddress[msg.sender];
		emit DelegationRemoved(_to, delegations[_to].tokensForVotingFromAddress[msg.sender]);
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

contract LiquidVoting is IVoting, DelegationTable {

	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote,
		uint _quorumPercent, uint _consensusPercent, address _tokenAddress, bool _isQuadraticVoting) public
		DelegationTable(_dao, _proposal, 
			_origin, _minutesToVote, _quorumPercent, _consensusPercent, _tokenAddress, _isQuadraticVoting)
	{
	}

	function internalVote(address _who, bool _yes) internal {

		uint tokenBalance = getPowerOf(_who);

		require(!addressVotedAlready[_who]);

		tokenVotesArray.push(TokenVote(_who, _yes, tokenBalance));
		addressVotedAlready[_who] = true;

		emit VotingSimpleToken_Vote(_who, _yes, tokenBalance);

		_callActionIfEnded();
	}
	
	function getPowerOf(address _who) public view returns(uint){

		if(delegations[_who].isDelegator || delegations[_who].isDelegatedFor){
			return stdDaoToken.getBalanceAtVoting(votingID, _who) - delegations[_who].blockedTokensForVoting + delegations[_who].tokensForVoting;
		}

		return stdDaoToken.getBalanceAtVoting(votingID, _who);

	}

	function getDelegatedToMePower() public view returns(uint) {

		return delegations[msg.sender].tokensForVoting;

	}

}
