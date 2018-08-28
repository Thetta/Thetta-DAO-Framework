pragma solidity ^0.4.23;

import "../IDaoBase.sol";
import "./IProposal.sol";
import "../utils/UtilsLib.sol";
import "../tokens/StdDaoToken.sol";


library VotingLib {
	event Voted(address _who, bool _yes);
	event CallAction();
	event DelegatedTo(address _sender, uint _tokensAmount);
	event DelegationRemoved(address _from, address _to);

	enum VotingType{
		NoVoting,
		Voting1p1v,
		VotingSimpleToken,
		VotingQuadratic,
		VotingLiquid
	}

	struct Delegation {
		address _address;
		uint amount;
		bool isDelegator; // is account in this struct who delegates the tokens
	}

	struct Vote {
		address voter;
		bool isYes;
	}	

	struct VotingStorage {
		IDaoBase dao;
		IProposal proposal; 
		uint minutesToVote; // time which voting will be active
		bool finishedWithYes; 
		bool canceled;
		uint genesis;
		uint quorumPercent;
		uint consensusPercent;
		address tokenAddress;
		uint votingID;
		string groupName;

		mapping(address=>bool) voted;
		mapping(uint=>Vote) votes;
		mapping(address=>Delegation[]) delegations;

		uint votesCount;
		VotingType votingType;	
	}

	function generalConstructor(
		VotingStorage storage store, 
		IDaoBase _dao, 
		IProposal _proposal, 
		address _origin, 
		VotingType _votingType, 
		uint _minutesToVote, 
		string _groupName, 
		uint _quorumPercent, 
		uint _consensusPercent, 
		address _tokenAddress) public 
	{	
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));

		store.dao = _dao;
		store.proposal = _proposal;
		store.minutesToVote = _minutesToVote;
		store.quorumPercent = _quorumPercent;
		store.consensusPercent = _consensusPercent;
		store.groupName = _groupName;
		store.votingType = _votingType;
		store.genesis = block.timestamp;

		if(VotingType.Voting1p1v!=store.votingType) {
			store.tokenAddress = _tokenAddress;
			store.votingID = StdDaoToken(_tokenAddress).startNewVoting();
		}

		libVote(store, _origin, true);
	}

	function getNow() public view returns(uint) {
		return block.timestamp;
	}

	function getVotersTotal(VotingStorage storage store)public view returns(uint) {	
		if(VotingType.Voting1p1v==store.votingType) {
			return store.dao.getMembersCount(store.groupName);
		}else if(VotingType.VotingSimpleToken==store.votingType) {
			return StdDaoToken(store.tokenAddress).totalSupply();
		}else if(VotingType.VotingQuadratic==store.votingType) {
			return StdDaoToken(store.tokenAddress).getVotingTotalForQuadraticVoting();
		}else if(VotingType.VotingLiquid==store.votingType) {
			return StdDaoToken(store.tokenAddress).totalSupply();
		}else {
			revert();
		}
	}

	function getPowerOf(VotingStorage storage store, address _voter)public view returns(uint) {
		if(VotingType.Voting1p1v==store.votingType) {
			if(store.dao.isGroupMember(store.groupName, _voter)) {
				return 1;
			}else {
				return 0;
			}	
		}else if(VotingType.VotingSimpleToken==store.votingType) {
			return StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, _voter);
		}else if(VotingType.VotingQuadratic==store.votingType) {
			return UtilsLib.sqrt(StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, _voter));
		}else if(VotingType.VotingLiquid==store.votingType) {
			uint res = StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, _voter);
			for(uint i = 0; i < store.delegations[_voter].length; i++) {
				if(!store.delegations[_voter][i].isDelegator) {
					res += store.delegations[_voter][i].amount;
				}else {
					res -= store.delegations[_voter][i].amount;
				}
			}
			return  res;
		}else {
			revert();
		}
	}

	function libVote(VotingStorage storage store, address _voter, bool _isYes) public {
		require(!isFinished(store));
		require(!store.voted[msg.sender]);

		if(VotingType.Voting1p1v==store.votingType) {
			require(store.dao.isGroupMember(store.groupName, _voter));
		}

		store.votes[store.votesCount] = Vote(_voter, _isYes);
		store.voted[_voter] = true;	
		store.votesCount += 1;
		emit Voted(msg.sender, _isYes);
		callActionIfEnded(store);
	}

	function isFinished(VotingStorage storage store) public view returns(bool) {
		if(store.canceled||store.finishedWithYes) {
			return true;
		}else if(store.minutesToVote>0) {
			return _isTimeElapsed(store);
		}else {
			return _isQuorumReached(store);
		}
	}

	function _isTimeElapsed(VotingStorage storage store) internal view returns(bool) {
		if(store.minutesToVote==0) {
			return false;
		}
		return (block.timestamp - store.genesis) > (store.minutesToVote * 60 * 1000);
	}

	function _isQuorumReached(VotingStorage storage store) internal view returns(bool) {
		var (yesResults, noResults, votersTotal) = getVotingStats(store);
		return ((yesResults + noResults) * 100) >= (votersTotal * store.quorumPercent);
	}

	function _isConsensusReached(VotingStorage storage store) internal view returns(bool) {
		var (yesResults, noResults, votersTotal) = getVotingStats(store);
		return (yesResults * 100) >= ((yesResults + noResults) * store.consensusPercent);
	}

	function isYes(VotingStorage storage store) public view returns(bool) {
		if(true==store.finishedWithYes) {
			return true;
		}
		return !store.canceled&& isFinished(store)&& 
			_isQuorumReached(store)&& _isConsensusReached(store);
	}	

	function getVotingStats(VotingStorage storage store) public view returns(uint yesResults, uint noResults, uint votersTotal) {
		for(uint i=0; i<store.votesCount; ++i) {
			if(store.votes[i].isYes) {
				yesResults+= getPowerOf(store, store.votes[i].voter);
			}else {
				noResults+= getPowerOf(store, store.votes[i].voter);
			}		
		}
		votersTotal = getVotersTotal(store);	
		return;
	}

	// returns delegated power for address
	function getDelegatedPowerOf(VotingStorage storage store, address _of) public view returns(uint res) {
		for(uint i = 0; i < store.delegations[_of].length; i++) {
			if(!store.delegations[_of][i].isDelegator) {
				res += store.delegations[_of][i].amount;
			}
		}
	}

	// returns delegated power from msg.sender to address _to
	function getDelegatedPowerByMe(VotingStorage storage store, address _to) public view returns(uint res) {
		for(uint i = 0; i < store.delegations[msg.sender].length; i++) {
			if(store.delegations[msg.sender][i]._address == _to) {
				if(store.delegations[msg.sender][i].isDelegator) {
					res += store.delegations[msg.sender][i].amount;
				}
			}
		}
	}

	// delegates power from msg.sender to specified address _to
	function delegateMyVoiceTo(VotingStorage storage store, address _to, uint _tokenAmount) public {
		require (_to!= address(0));
		require (_tokenAmount <= StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, msg.sender));

		for(uint i = 0; i < store.delegations[_to].length; i++) {
			if(store.delegations[_to][i]._address == msg.sender) {
				store.delegations[_to][i].amount = _tokenAmount;
			}
		}
		for(i = 0; i < store.delegations[msg.sender].length; i++) {
			if(store.delegations[msg.sender][i]._address == _to) {
				store.delegations[msg.sender][i].amount = _tokenAmount;
				emit DelegatedTo(_to, _tokenAmount);
				return;
			}
		}
		store.delegations[_to].push(Delegation(msg.sender, _tokenAmount, false));
		store.delegations[msg.sender].push(Delegation(_to, _tokenAmount, true));
	}

	// delete delegation from msg.sender to specified address _to
	function removeDelegation(VotingStorage storage store, address _to) public {
		require (_to!= address(0));

		for(uint i = 0; i < store.delegations[_to].length; i++) {
			if(store.delegations[_to][i]._address == msg.sender) {
				store.delegations[_to][i].amount = 0;
			}
		}
		for(i = 0; i < store.delegations[msg.sender].length; i++) {
			if(store.delegations[msg.sender][i]._address == _to) {
				store.delegations[msg.sender][i].amount = 0;
			}		
		}
		emit DelegationRemoved(msg.sender, _to);
	}

	function callActionIfEnded(VotingStorage storage store) public {
		if(!store.finishedWithYes && isFinished(store) && isYes(store)) { 
			// should not be callable again!!!
			store.finishedWithYes = true;
			emit CallAction();
			store.proposal.action(); // can throw!
		}
	}			
}