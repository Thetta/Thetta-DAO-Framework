
pragma solidity ^0.4.22;

import '../IDaoBase.sol';
import './IVoting.sol';
import './IProposal.sol';
import '../tokens/StdDaoToken.sol';
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Voting is IVoting, Ownable {
	IDaoBase dao;
	IProposal proposal; 

	uint public minutesToVote;
	bool finishedWithYes;
	bool canceled = false;
	uint64 genesis;
	uint public quorumPercent;
	uint public consensusPercent;

	address tokenAddress;
	uint votingID;
	string public groupName;

	struct Vote{
		address voter;
		bool isYes;
	}

	mapping(address=>bool) voted;
	mapping(uint=>Vote) votes;

	uint votesCount = 0;
	VotingType votingType;

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

	// ------ LIQUID ------
	struct Delegation {
		address _address;
		uint amount;
		bool isDelegator;
	}	

	mapping (address => Delegation[]) delegations;

	/*
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _votingType
	 * @param _groupName
	 * @param _tokenAddress
	*/
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		address _tokenAddress) public 
	{
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));

		dao = _dao;
		proposal = _proposal;
		minutesToVote = _minutesToVote;
		quorumPercent = _quorumPercent;
		consensusPercent = _consensusPercent;
		groupName = _groupName;
		votingType = _votingType;
		genesis = uint64(now);

		if(VotingType.Voting1p1v!=votingType){
			tokenAddress = _tokenAddress;
			votingID = StdDaoToken(_tokenAddress).startNewVoting();
		}

		_vote(_origin, true);
	}

	function getVotersTotal() view returns(uint){
		if(VotingType.Voting1p1v==votingType){
			return dao.getMembersCount(groupName);
		}else if(VotingType.VotingSimpleToken==votingType){
			return StdDaoToken(tokenAddress).totalSupply();
		}else if(VotingType.VotingQuadratic==votingType){
			return StdDaoToken(tokenAddress).getVotingTotalForQuadraticVoting();
		}else if(VotingType.VotingLiquid==votingType){
			return StdDaoToken(tokenAddress).totalSupply();		
		}else{
			revert();
		}
	}

	function getPowerOf(address _voter) view returns(uint){
		if(VotingType.Voting1p1v==votingType){
			if(dao.isGroupMember(groupName, _voter)){
				return 1;
			}else{
				return 0;
			}	
		}else if(VotingType.VotingSimpleToken==votingType){
			return StdDaoToken(tokenAddress).getBalanceAtVoting(votingID, _voter);		
		}else if(VotingType.VotingQuadratic==votingType){
			return _sqrt(StdDaoToken(tokenAddress).getBalanceAtVoting(votingID, _voter));		
		}else if(VotingType.VotingLiquid==votingType){
			uint res = StdDaoToken(tokenAddress).getBalanceAtVoting(votingID, _voter);
			for(uint i = 0; i < delegations[_voter].length; i++){
				if(!delegations[_voter][i].isDelegator){
					res += delegations[_voter][i].amount;
				}else{
					res -= delegations[_voter][i].amount;
				}
			}
			return  res;
		}else{
			revert();
		}
	}

	function _sqrt(uint x) internal pure returns (uint y) {
		uint z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}

	function vote(bool _isYes) public {
		require(!isFinished());
		require(!voted[msg.sender]);
		_vote(msg.sender, _isYes);
	}

	function _vote(address _voter, bool _isYes) internal {
		votes[votesCount] = Vote(_voter, _isYes);
		voted[_voter] = true;
		emit Voted(_voter, _isYes);
		votesCount += 1;
		callActionIfEnded();
	}

	function callActionIfEnded() public {
		if(!finishedWithYes && isFinished() && isYes()){ 
			// should not be callable again!!!
			finishedWithYes = true;
			emit CallAction();
			proposal.action(); // can throw!
		}
	}

	function isFinished() public view returns(bool){
		if(canceled){
			return true;

		}else if(minutesToVote!=0){
			return _isTimeElapsed();

		}else if(finishedWithYes){
			return true;

		}else{
			return _isQuorumReached();
		}
	}

	function _isTimeElapsed() internal view returns(bool){
		if(minutesToVote==0){
			return false;
		}
		return (uint64(now) - genesis) >= (minutesToVote * 60 * 1000);
	}

	function _isQuorumReached() internal view returns(bool){
		var (yesResults, noResults, votersTotal) = getVotingStats();
		return ((yesResults + noResults) * 100) >= (votersTotal * quorumPercent);
	}

	function _isConsensusReached() internal view returns(bool){
		var (yesResults, noResults, votersTotal) = getVotingStats();
		return (yesResults * 100) >= ((yesResults + noResults) * consensusPercent);
	}

	function isYes() public view returns(bool){
		if(true==finishedWithYes){
			return true;
		}
		return !canceled&& isFinished()&& 
			_isQuorumReached()&& _isConsensusReached();
	}

	function getVotingStats() public constant returns(uint yesResults, uint noResults, uint votersTotal){
		for(uint i=0; i<votesCount; ++i){
			if(votes[i].isYes){
				yesResults+= getPowerOf(votes[i].voter);
			}else{
				noResults+= getPowerOf(votes[i].voter);
			}		
		}
		votersTotal = getVotersTotal();	
		return;
	}

	function cancelVoting() public onlyOwner {
		canceled = true;
	}

	// ------------------ LIQUID ------------------

	function getDelegatedPowerOf(address _of) public view returns(uint res) {
		for(uint i = 0; i < delegations[_of].length; i++){
			if(!delegations[_of][i].isDelegator){
				res += delegations[_of][i].amount;
			}
		}
	}

	function getDelegatedPowerByMe(address _to) public view returns(uint res) {
		for(uint i = 0; i < delegations[msg.sender].length; i++){
			if(delegations[msg.sender][i]._address == _to){
				if(delegations[msg.sender][i].isDelegator){
					res += delegations[msg.sender][i].amount;
				}
			}
		}
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) public {
		require (_to!= address(0));
		require (_tokenAmount <= StdDaoToken(tokenAddress).getBalanceAtVoting(votingID, msg.sender));

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
