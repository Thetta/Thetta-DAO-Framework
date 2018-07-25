pragma solidity ^0.4.22;

import '../IDaoBase.sol';
import './IVoting.sol';
import './IProposal.sol';
import '../tokens/StdDaoToken.sol';
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// TODO Stacked voting:
// 1 - client transfers N tokens for D days
// 2 - client calls vote(_yes, _tokenAmount) 
// 3 - the result is calculated

contract Voting is IVoting, Ownable {
	using VotingLib for VotingLib.VotingStorage;
	VotingLib.VotingStorage store;
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

	/*
	 * @param _dao – DAO where proposal was created.
	 * @param _proposal – proposal, which create vote.
	 * @param _origin – who create voting (group member).
	 * @param _minutesToVote - if is zero -> voting until quorum reached, else voting finish after minutesToVote minutes
	 * @param _quorumPercent - percent of group members to make quorum reached. If minutesToVote==0 and quorum reached -> voting is finished
	 * @param _consensusPercent - percent of voters (not of group members!) to make consensus reached. If consensus reached -> voting is finished with YES result
	 * @param _votingType – one of the voting type, see enum votingType
	 * @param _groupName – for votings that for dao group members only
	 * @param _tokenAddress – for votings that uses token amount of voter
	*/
	constructor(IDaoBase _dao, IProposal _proposal, 
		address _origin, VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		address _tokenAddress) public 
	{
		store.generalConstructor(_dao, _proposal, _origin, _votingType, _minutesToVote, _groupName, _quorumPercent, _consensusPercent, _tokenAddress);
	}

	function quorumPercent()view returns(uint){
		return store.quorumPercent;
	}

	function consensusPercent()view returns(uint){
		return store.consensusPercent;
	}	

	function groupName()view returns(string){
		return store.groupName;
	}		

	function getVotersTotal() view returns(uint){
		return store.getVotersTotal();
	}

	function getPowerOf(address _voter) view returns(uint){
		return store.getPowerOf(_voter);
	}

	function vote(bool _isYes) public{
		store.libVote(msg.sender, _isYes);
	}

	function callActionIfEnded() public {
		store.callActionIfEnded();
	}

	function isFinished() public view returns(bool){
		return store.isFinished();
	}

	function isYes() public view returns(bool){
		return store.isYes();
	}

	function getVotingStats() public constant returns(uint yesResults, uint noResults, uint votersTotal){
		return store.getVotingStats();
	}

	function cancelVoting() public onlyOwner {
		store.canceled = true;
	}

	// ------------------ LIQUID ------------------
	function getDelegatedPowerOf(address _of) public view returns(uint) {
		return store.getDelegatedPowerOf(_of);
	}

	function getDelegatedPowerByMe(address _to) public view returns(uint) {
		return store.getDelegatedPowerByMe(_to);
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) public {
		store.delegateMyVoiceTo(_to, _tokenAmount);
	}

	function removeDelegation(address _to) public {
		store.removeDelegation(_to);
	}
}

library VotingLib {
	event Voted(address _who, bool _yes);
	event CallAction();
	event DelegatedTo(address _sender, uint _tokensAmount);
	event DelegationRemoved(address _from, address _to);

	struct Delegation {
		address _address;
		uint amount;
		bool isDelegator;
	}

	struct Vote{
		address voter;
		bool isYes;
	}	

	struct VotingStorage{
		IDaoBase dao;
		IProposal proposal; 
		uint minutesToVote;
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
		Voting.VotingType votingType;	
	}

	function generalConstructor(VotingStorage storage store, IDaoBase _dao, IProposal _proposal, 
		address _origin, Voting.VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
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
		store.genesis = now;

		if(Voting.VotingType.Voting1p1v!=store.votingType){
			store.tokenAddress = _tokenAddress;
			store.votingID = StdDaoToken(_tokenAddress).startNewVoting();
		}
		libVote(store, _origin, true);
	}

	function getNow() public view returns(uint){
		return now;
	}

	function getVotersTotal(VotingStorage storage store)public view returns(uint){	
		if(Voting.VotingType.Voting1p1v==store.votingType){
			return store.dao.getMembersCount(store.groupName);
		}else if(Voting.VotingType.VotingSimpleToken==store.votingType){
			return StdDaoToken(store.tokenAddress).totalSupply();
		}else if(Voting.VotingType.VotingQuadratic==store.votingType){
			return StdDaoToken(store.tokenAddress).getVotingTotalForQuadraticVoting();
		}else if(Voting.VotingType.VotingLiquid==store.votingType){
			return StdDaoToken(store.tokenAddress).totalSupply();
		}else{
			revert();
		}
	}

	function getPowerOf(VotingStorage storage store, address _voter)public view returns(uint){
		if(Voting.VotingType.Voting1p1v==store.votingType){
			if(store.dao.isGroupMember(store.groupName, _voter)){
				return 1;
			}else{
				return 0;
			}	
		}else if(Voting.VotingType.VotingSimpleToken==store.votingType){
			return StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, _voter);
		}else if(Voting.VotingType.VotingQuadratic==store.votingType){
			return sqrt(StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, _voter));
		}else if(Voting.VotingType.VotingLiquid==store.votingType){
			uint res = StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, _voter);
			for(uint i = 0; i < store.delegations[_voter].length; i++){
				if(!store.delegations[_voter][i].isDelegator){
					res += store.delegations[_voter][i].amount;
				}else{
					res -= store.delegations[_voter][i].amount;
				}
			}
			return  res;
		}else{
			revert();
		}
	}

	function sqrt(uint x) public pure returns (uint y){
		uint z = (x+1)/2;
		y = x;
		while (z<y){
			y = z;
			z = (x/z+z)/2;
		}
	}

	function libVote(VotingStorage storage store, address _voter, bool _isYes) public {
		require(!isFinished(store));
		require(!store.voted[msg.sender]);

		if(Voting.VotingType.Voting1p1v==store.votingType){
			require(store.dao.isGroupMember(store.groupName, _voter));
		}

		store.votes[store.votesCount] = Vote(_voter, _isYes);
		store.voted[_voter] = true;	
		store.votesCount += 1;
		emit Voted(msg.sender, _isYes);
		callActionIfEnded(store);
	}

	function isFinished(VotingStorage storage store) public view returns(bool){
		if(store.canceled||store.finishedWithYes){
			return true;
		}else if(store.minutesToVote>0){
			return _isTimeElapsed(store);
		}else{
			return _isQuorumReached(store);
		}
	}

	function _isTimeElapsed(VotingStorage storage store) internal view returns(bool){
		if(store.minutesToVote==0){
			return false;
		}
		return (now - store.genesis) > (store.minutesToVote * 60 * 1000);
	}

	function _isQuorumReached(VotingStorage storage store) internal view returns(bool){
		var (yesResults, noResults, votersTotal) = getVotingStats(store);
		return ((yesResults + noResults) * 100) >= (votersTotal * store.quorumPercent);
	}

	function _isConsensusReached(VotingStorage storage store) internal view returns(bool){
		var (yesResults, noResults, votersTotal) = getVotingStats(store);
		return (yesResults * 100) >= ((yesResults + noResults) * store.consensusPercent);
	}

	function isYes(VotingStorage storage store) public view returns(bool){
		if(true==store.finishedWithYes){
			return true;
		}
		return !store.canceled&& isFinished(store)&& 
			_isQuorumReached(store)&& _isConsensusReached(store);
	}	

	function getVotingStats(VotingStorage storage store) public constant returns(uint yesResults, uint noResults, uint votersTotal){
		for(uint i=0; i<store.votesCount; ++i){
			if(store.votes[i].isYes){
				yesResults+= getPowerOf(store, store.votes[i].voter);
			}else{
				noResults+= getPowerOf(store, store.votes[i].voter);
			}		
		}
		votersTotal = getVotersTotal(store);	
		return;
	}

	function getDelegatedPowerOf(VotingStorage storage store, address _of) public view returns(uint res) {
		for(uint i = 0; i < store.delegations[_of].length; i++){
			if(!store.delegations[_of][i].isDelegator){
				res += store.delegations[_of][i].amount;
			}
		}
	}

	function getDelegatedPowerByMe(VotingStorage storage store, address _to) public view returns(uint res) {
		for(uint i = 0; i < store.delegations[msg.sender].length; i++){
			if(store.delegations[msg.sender][i]._address == _to){
				if(store.delegations[msg.sender][i].isDelegator){
					res += store.delegations[msg.sender][i].amount;
				}
			}
		}
	}

	function delegateMyVoiceTo(VotingStorage storage store, address _to, uint _tokenAmount) public {
		require (_to!= address(0));
		require (_tokenAmount <= StdDaoToken(store.tokenAddress).getBalanceAtVoting(store.votingID, msg.sender));

		for(uint i = 0; i < store.delegations[_to].length; i++){
			if(store.delegations[_to][i]._address == msg.sender){
				store.delegations[_to][i].amount = _tokenAmount;
			}
		}
		for(i = 0; i < store.delegations[msg.sender].length; i++){
			if(store.delegations[msg.sender][i]._address == _to){
				store.delegations[msg.sender][i].amount = _tokenAmount;
				emit DelegatedTo(_to, _tokenAmount);
				return;
			}
		}
		store.delegations[_to].push(Delegation(msg.sender, _tokenAmount, false));
		store.delegations[msg.sender].push(Delegation(_to, _tokenAmount, true));
	}

	function removeDelegation(VotingStorage storage store, address _to) public {
		require (_to!= address(0));

		for(uint i = 0; i < store.delegations[_to].length; i++){
			if(store.delegations[_to][i]._address == msg.sender){
				store.delegations[_to][i].amount = 0;
			}
		}
		for(i = 0; i < store.delegations[msg.sender].length; i++){
			if(store.delegations[msg.sender][i]._address == _to){
				store.delegations[msg.sender][i].amount = 0;
			}		
		}
		emit DelegationRemoved(msg.sender, _to);
	}

	function callActionIfEnded(VotingStorage storage store) public {
		if(!store.finishedWithYes && isFinished(store) && isYes(store)){ 
			// should not be callable again!!!
			store.finishedWithYes = true;
			emit CallAction();
			store.proposal.action(); // can throw!
		}
	}			
}