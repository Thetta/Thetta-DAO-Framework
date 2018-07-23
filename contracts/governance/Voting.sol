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
	VotingLib.VotingStorage stor;

	event Voted(address _who, bool _yes);
	event CallAction();
	event DelegatedTo(address _sender, uint _tokensAmount);
	event DelegationRemoved(address _from, address _to);
	
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
		address _origin, VotingLib.VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		address _tokenAddress) public 
	{
		stor.generalConstructor(_dao, _proposal, _origin, _votingType, _minutesToVote, _groupName, _quorumPercent, _consensusPercent, _tokenAddress);
	}

	function quorumPercent()view returns(uint){
		return stor.quorumPercent;
	}

	function consensusPercent()view returns(uint){
		return stor.consensusPercent;
	}	

	function groupName()view returns(string){
		return stor.groupName;
	}		

	function getVotersTotal() view returns(uint){
		return stor.getVotersTotal();
	}

	function getPowerOf(address _voter) view returns(uint){
		return stor.getPowerOf(_voter);
	}

	function vote(bool _isYes) public{
		stor.libVote(msg.sender, _isYes);
	}

	function callActionIfEnded() public {
		stor.callActionIfEnded();
	}

	function isFinished() public view returns(bool){
		return stor.isFinished();
	}

	function isYes() public view returns(bool){
		return stor.isYes();
	}

	function getVotingStats() public constant returns(uint yesResults, uint noResults, uint votersTotal){
		return stor.getVotingStats();
	}

	function cancelVoting() public onlyOwner {
		stor.canceled = true;
	}

	// ------------------ LIQUID ------------------

	function getDelegatedPowerOf(address _of) public view returns(uint) {
		return stor.getDelegatedPowerOf(_of);
	}

	function getDelegatedPowerByMe(address _to) public view returns(uint) {
		return stor.getDelegatedPowerByMe(_to);
	}

	function delegateMyVoiceTo(address _to, uint _tokenAmount) public {
		stor.delegateMyVoiceTo(_to, _tokenAmount);
	}

	function removeDelegation(address _to) public {
		stor.removeDelegation(_to);
	}
}

library VotingLib {
	event Voted(address _who, bool _yes);
	event CallAction();
	event DelegatedTo(address _sender, uint _tokensAmount);
	event DelegationRemoved(address _from, address _to);

	event consoleUint(string a, uint b);

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
		VotingType votingType;	
	}

	function generalConstructor(VotingStorage storage self, IDaoBase _dao, IProposal _proposal, 
		address _origin, VotingType _votingType, 
		uint _minutesToVote, string _groupName, 
		uint _quorumPercent, uint _consensusPercent, 
		address _tokenAddress) public 
	{
	
		require((_quorumPercent<=100)&&(_quorumPercent>0));
		require((_consensusPercent<=100)&&(_consensusPercent>0));

		self.dao = _dao;
		self.proposal = _proposal;
		self.minutesToVote = _minutesToVote;
		self.quorumPercent = _quorumPercent;
		self.consensusPercent = _consensusPercent;
		self.groupName = _groupName;
		self.votingType = _votingType;
		self.genesis = now;

		if(VotingType.Voting1p1v!=self.votingType){
			self.tokenAddress = _tokenAddress;
			self.votingID = StdDaoToken(_tokenAddress).startNewVoting();
		}
		libVote(self, _origin, true);
	}

	function getNow() public view returns(uint){
		return now;
	}

	function getVotersTotal(VotingStorage storage self)public view returns(uint){	
		if(VotingType.Voting1p1v==self.votingType){
			return self.dao.getMembersCount(self.groupName);
		}else if(VotingType.VotingSimpleToken==self.votingType){
			return StdDaoToken(self.tokenAddress).totalSupply();
		}else if(VotingType.VotingQuadratic==self.votingType){
			return StdDaoToken(self.tokenAddress).getVotingTotalForQuadraticVoting();
		}else if(VotingType.VotingLiquid==self.votingType){
			return StdDaoToken(self.tokenAddress).totalSupply();
		}else{
			revert();
		}
	}

	 function getPowerOf(VotingStorage storage self, address _voter)public view returns(uint){
		if(VotingType.Voting1p1v==self.votingType){
			if(self.dao.isGroupMember(self.groupName, _voter)){
				return 1;
			}else{
				return 0;
			}	
		}else if(VotingType.VotingSimpleToken==self.votingType){
			return StdDaoToken(self.tokenAddress).getBalanceAtVoting(self.votingID, _voter);
		}else if(VotingType.VotingQuadratic==self.votingType){
			return sqrt(StdDaoToken(self.tokenAddress).getBalanceAtVoting(self.votingID, _voter));
		}else if(VotingType.VotingLiquid==self.votingType){
			uint res = StdDaoToken(self.tokenAddress).getBalanceAtVoting(self.votingID, _voter);
			for(uint i = 0; i < self.delegations[_voter].length; i++){
				if(!self.delegations[_voter][i].isDelegator){
					res += self.delegations[_voter][i].amount;
				}else{
					res -= self.delegations[_voter][i].amount;
				}
			}
			return  res;
		}else{
			revert();
		}
	}

	function sqrt(uint x) public pure returns (uint y){
		uint z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}

	function libVote(VotingStorage storage self, address _voter, bool _isYes) public {
		require(!isFinished(self));
		require(!self.voted[msg.sender]);

		if(VotingType.Voting1p1v==self.votingType){
			require(self.dao.isGroupMember(self.groupName, _voter));
		}

		self.votes[self.votesCount] = Vote(_voter, _isYes);
		self.voted[_voter] = true;	
		self.votesCount += 1;
		emit Voted(msg.sender, _isYes);
		callActionIfEnded(self);
	}

	function isFinished(VotingStorage storage self) public view returns(bool){
		if(self.canceled||self.finishedWithYes){
			return true;

		}else if(self.minutesToVote>0){
			return _isTimeElapsed(self);

		}else{
			return _isQuorumReached(self);
		}
	}

	function _isTimeElapsed(VotingStorage storage self) internal view returns(bool){
		emit consoleUint('uint256(now)', getNow());
		emit consoleUint('self.genesis', self.genesis);
		emit consoleUint('(self.minutesToVote * 60 * 1000)', (self.minutesToVote * 60 * 1000));
		if(self.minutesToVote==0){
			return false;
		}
		return (now - self.genesis) > (self.minutesToVote * 60 * 1000);
	}

	function _isQuorumReached(VotingStorage storage self) internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = getVotingStats(self);
		return ((yesResults + noResults) * 100) >= (votersTotal * self.quorumPercent);
	}

	function _isConsensusReached(VotingStorage storage self) internal view returns(bool){
		uint yesResults = 0;
		uint noResults = 0;
		uint votersTotal = 0;

		(yesResults, noResults, votersTotal) = getVotingStats(self);
		return (yesResults * 100) >= ((yesResults + noResults) * self.consensusPercent);
	}

	function isYes(VotingStorage storage self) public view returns(bool){
		if(true==self.finishedWithYes){
			return true;
		}
		return !self.canceled&& isFinished(self)&& 
			_isQuorumReached(self)&& _isConsensusReached(self);
	}	

	function getVotingStats(VotingStorage storage self) public constant returns(uint yesResults, uint noResults, uint votersTotal){
		for(uint i=0; i<self.votesCount; ++i){
			if(self.votes[i].isYes){
				yesResults+= getPowerOf(self, self.votes[i].voter);
			}else{
				noResults+= getPowerOf(self, self.votes[i].voter);
			}		
		}
		votersTotal = getVotersTotal(self);	
		return;
	}

	function getDelegatedPowerOf(VotingStorage storage self, address _of) public view returns(uint res) {
		for(uint i = 0; i < self.delegations[_of].length; i++){
			if(!self.delegations[_of][i].isDelegator){
				res += self.delegations[_of][i].amount;
			}
		}
	}

	function getDelegatedPowerByMe(VotingStorage storage self, address _to) public view returns(uint res) {
		for(uint i = 0; i < self.delegations[msg.sender].length; i++){
			if(self.delegations[msg.sender][i]._address == _to){
				if(self.delegations[msg.sender][i].isDelegator){
					res += self.delegations[msg.sender][i].amount;
				}
			}
		}
	}

	function delegateMyVoiceTo(VotingStorage storage self, address _to, uint _tokenAmount) public {
		require (_to!= address(0));
		require (_tokenAmount <= StdDaoToken(self.tokenAddress).getBalanceAtVoting(self.votingID, msg.sender));

		for(uint i = 0; i < self.delegations[_to].length; i++){
			if(self.delegations[_to][i]._address == msg.sender){
				self.delegations[_to][i].amount = _tokenAmount;
			}
		}

		for(i = 0; i < self.delegations[msg.sender].length; i++){
			if(self.delegations[msg.sender][i]._address == _to){
				self.delegations[msg.sender][i].amount = _tokenAmount;
				emit DelegatedTo(_to, _tokenAmount);
				return;
			}
		}

		self.delegations[_to].push(Delegation(msg.sender, _tokenAmount, false));
		self.delegations[msg.sender].push(Delegation(_to, _tokenAmount, true));
	}

	function removeDelegation(VotingStorage storage self, address _to) public {
		require (_to!= address(0));

		for(uint i = 0; i < self.delegations[_to].length; i++){
			if(self.delegations[_to][i]._address == msg.sender){
				self.delegations[_to][i].amount = 0;
			}
		}

		for(i = 0; i < self.delegations[msg.sender].length; i++){
			if(self.delegations[msg.sender][i]._address == _to){
				self.delegations[msg.sender][i].amount = 0;
			}		}

		emit DelegationRemoved(msg.sender, _to);
	}

	function callActionIfEnded(VotingStorage storage self) public {
		if(!self.finishedWithYes && isFinished(self) && isYes(self)){ 
			// should not be callable again!!!
			self.finishedWithYes = true;
			emit CallAction();
			self.proposal.action(); // can throw!
		}
	}			
}