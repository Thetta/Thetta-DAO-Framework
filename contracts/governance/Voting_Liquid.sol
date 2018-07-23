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

	mapping (uint => mapping(address => Delegation[])) delegations;
	
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, uint _minutesToVote,
		uint _quorumPercent, uint _consensusPercent, address _tokenAddress, bool _isQuadraticVoting) public
		Voting_SimpleToken(_dao, _proposal, 
			_origin, _minutesToVote, _quorumPercent, _consensusPercent, _tokenAddress, _isQuadraticVoting)
	{
	}

	function internalVote(address _who, bool _yes, uint _votingID) internal {
		uint tokenBalance = getPowerOf(_who, _votingID);

		require(!addressVotedAlready[votingID][_who]);

		tokenVotesArray[_votingID].push(TokenVote(_who, _yes, tokenBalance));
		addressVotedAlready[votingID][_who] = true;

		emit VotingSimpleToken_Vote(_who, _yes, tokenBalance);

		callActionIfEnded(_votingID);
	}
	
	function getPowerOf(address _who, uint _votingID) public view returns(uint){
		uint res = stdDaoToken.getBalanceAtVoting(_votingID, _who);

		for(uint i = 0; i < delegations[_votingID][_who].length; i++){
				if(!delegations[_votingID][_who][i].isDelegator){
					res += delegations[_votingID][_who][i].amount;
				}
				if(delegations[_votingID][_who][i].isDelegator){
					res -= delegations[_votingID][_who][i].amount;
				}
		}

		return  res;
	}

	function getDelegatedPowerOf(address _of, uint _votingID) public view returns(uint) {
		uint res;

		for(uint i = 0; i < delegations[_votingID][_of].length; i++){
				if(!delegations[_votingID][_of][i].isDelegator){
					res += delegations[_votingID][_of][i].amount;
				}
		}

		return res;
	}

	function getDelegatedPowerByMe(address _to, uint _votingID) public view returns(uint) {
		uint res;

		for(uint i = 0; i < delegations[_votingID][msg.sender].length; i++){
			if(delegations[_votingID][msg.sender][i]._address == _to){
				if(delegations[_votingID][msg.sender][i].isDelegator){
					res += delegations[_votingID][msg.sender][i].amount;
				}
			}
		}

		return res;
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount, uint _votingID) public {
		require (_to!= address(0));
		require (_tokenAmount <= stdDaoToken.getBalanceAtVoting(votingID, msg.sender));

		for(uint i = 0; i < delegations[_votingID][_to].length; i++){
			if(delegations[_votingID][_to][i]._address == msg.sender){
				delegations[_votingID][_to][i].amount = _tokenAmount;
			}
		}

		for(i = 0; i < delegations[_votingID][msg.sender].length; i++){
			if(delegations[_votingID][msg.sender][i]._address == _to){
				delegations[_votingID][msg.sender][i].amount = _tokenAmount;
				emit DelegatedTo(_to, _tokenAmount);
				return;
			}
		}

		delegations[_votingID][_to].push(Delegation(msg.sender, _tokenAmount, false));
		delegations[_votingID][msg.sender].push(Delegation(_to, _tokenAmount, true));
	}

	function removeDelegation(address _to, uint _votingID) public {
		require (_to!= address(0));

		for(uint i = 0; i < delegations[_votingID][_to].length; i++){
			if(delegations[_votingID][_to][i]._address == msg.sender){
				delegations[_votingID][_to][i].amount = 0;
			}
		}

		for(i = 0; i < delegations[_votingID][msg.sender].length; i++){
			if(delegations[_votingID][msg.sender][i]._address == _to){
				delegations[_votingID][msg.sender][i].amount = 0;
			}
		}

		emit DelegationRemoved(msg.sender, _to);
	}
}
