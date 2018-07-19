pragma solidity ^0.4.22;

import './IVoting.sol';

import "../tokens/StdDaoToken.sol";

import "./Voting_SimpleToken.sol";


contract LiquidVoting is IDelegationTable, Voting_SimpleToken {
	struct Delegation {
		address _address;
		uint amount;
		bool isDelegator;
	}	

	event DelegatedTo(address _sender, uint _tokensAmount);
	event DelegationRemoved(address _from, address _to);

	mapping (address => Delegation[]) delegations;
	
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote,
		uint _quorumPercent, uint _consensusPercent, address _tokenAddress, bool _isQuadraticVoting) public
		Voting_SimpleToken(_dao, _proposal, 
			_origin, _minutesToVote, _quorumPercent, _consensusPercent, _tokenAddress, _isQuadraticVoting)
	{
	}

	function internalVote(address _who, bool _yes) internal {
		uint tokenBalance = getPowerOf(_who);

		require(!addressVotedAlready[_who]);

		tokenVotesArray.push(TokenVote(_who, _yes, tokenBalance));
		addressVotedAlready[_who] = true;

		emit VotingSimpleToken_Vote(_who, _yes, tokenBalance);

		callActionIfEnded();
	}
	
	function getPowerOf(address _who) public view returns(uint){
		uint res = stdDaoToken.getBalanceAtVoting(votingID, _who);

		for(uint i = 0; i < delegations[_who].length; i++){
				if(!delegations[_who][i].isDelegator){
					res += delegations[_who][i].amount;
				}
				if(delegations[_who][i].isDelegator){
					res -= delegations[_who][i].amount;
				}
		}

		return  res;
	}

	function getDelegatedPowerOf(address _of) public view returns(uint) {
		uint res;

		for(uint i = 0; i < delegations[_of].length; i++){
				if(!delegations[_of][i].isDelegator){
					res += delegations[_of][i].amount;
				}
		}

		return res;
	}

	function getDelegatedPowerByMe(address _to) public view returns(uint) {
		uint res;

		for(uint i = 0; i < delegations[msg.sender].length; i++){
			if(delegations[msg.sender][i]._address == _to){
				if(delegations[msg.sender][i].isDelegator){
					res += delegations[msg.sender][i].amount;
				}
			}
		}

		return res;
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) public {
		require (_to!= address(0));
		require (_tokenAmount <= stdDaoToken.getBalanceAtVoting(votingID, msg.sender));

		for(uint i = 0; i < delegations[_to].length; i++){
			if(delegations[_to][i]._address == msg.sender){
				delegations[_to][i].amount = _tokenAmount;
			}
		}

		for(i = 0; i < delegations[msg.sender].length; i++){
			if(delegations[msg.sender][i]._address == _to){
				delegations[msg.sender][i].amount = _tokenAmount;
				emit DelegatedTo(_to, _tokenAmount);
				return;
			}
		}

		delegations[_to].push(Delegation(msg.sender, _tokenAmount, false));
		delegations[msg.sender].push(Delegation(_to, _tokenAmount, true));
	}

	function removeDelegation(address _to) public {
		require (_to!= address(0));

		for(uint i = 0; i < delegations[_to].length; i++){
			if(delegations[_to][i]._address == msg.sender){
				delegations[_to][i].amount = 0;
			}
		}

		for(i = 0; i < delegations[msg.sender].length; i++){
			if(delegations[msg.sender][i]._address == _to){
				delegations[msg.sender][i].amount = 0;
			}
		}

		emit DelegationRemoved(msg.sender, _to);
	}
}
