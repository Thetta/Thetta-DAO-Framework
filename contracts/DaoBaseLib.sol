pragma solidity ^0.4.22;

import "./utils/UtilsLib.sol";
import "./DaoStorage.sol";


library DaoBaseLib {
	function upgradeDaoContract(DaoStorage _daoStorage, IDaoBase _new) public {
		for(uint i=0; i<_daoStorage.getObserversCount(); ++i) {
			IDaoObserver(_daoStorage.getObserverAtIndex(i)).onUpgrade(_new);
		}

		_daoStorage.transferOwnership(_new);

		for(i=0; i<_daoStorage.getTokensCount(); ++i) { // transfer ownership of all tokens (this -> _new)
			_daoStorage.getTokenAtIndex(i).transferOwnership(_new);
		}
	}

	function isCanDoAction(DaoStorage _daoStorage, address _a, bytes32 _permissionNameHash) public view returns(bool) {
		// 0 - is can do by address?
		DaoStorage store = DaoStorage(_daoStorage);

		if(store.isAllowedActionByAddress(_permissionNameHash, _a)) {
			return true;
		}

		// 1 - check if group member can do that without voting?
		if(store.isAllowedActionByMembership(_permissionNameHash, _a)) {
			return true;
		}

		for(uint i=0; i<store.getTokensCount(); ++i) {
			// 2 - check if shareholder can do that without voting?
			if(store.isAllowedActionByShareholder(_permissionNameHash, store.getTokenAtIndex(i)) && 
				(store.getTokenAtIndex(i).balanceOf(_a) != 0)) {
				return true;
			}
			// 3 - can do action only by starting new vote first?
			bool isCan = store.isAllowedActionByVoting(_permissionNameHash, store.getTokenAtIndex(i));
			if(isCan) {
				bool isVotingFound = false;
				bool votingResult = false;
				(isVotingFound, votingResult) = getProposalVotingResults(_daoStorage, _a);
				if(isVotingFound) {
					// if this action can be done by voting, then Proposal can do this action 
					// from within its context in this case msg.sender is a Voting!
					return votingResult;
				}
				// 4 - only token holders with > 51% of gov.tokens can add new task immediately, otherwise -> start voting
				bool isInMajority = 
					(store.getTokenAtIndex(i).balanceOf(_a)) >
					(store.getTokenAtIndex(i).totalSupply() / 2);
				if(isInMajority) {
					return true;
				}
			}
		}

		return false;
	}

	function issueTokens(DaoStorage _daoStorage, address _tokenAddress, address _to, uint _amount) public {
		for(uint i=0; i<DaoStorage(_daoStorage).getTokensCount(); ++i) {
			if(DaoStorage(_daoStorage).getTokenAtIndex(i) == _tokenAddress) {
				// WARNING: token ownership should be transferred to the current DaoBase to do that!!!
				DaoStorage(_daoStorage).getTokenAtIndex(i).mintFor(_to, _amount);
				return;
			}
		}

		revert(); // if not found!
	}

	function burnTokens(DaoStorage _daoStorage, address _tokenAddress, address _who, uint _amount) public {
		for(uint i=0; i<DaoStorage(_daoStorage).getTokensCount(); ++i) {
			if(DaoStorage(_daoStorage).getTokenAtIndex(i) == _tokenAddress) {
				// WARNING: token ownership should be transferred to the current DaoBase to do that!!!
				DaoStorage(_daoStorage).getTokenAtIndex(i).burnFor(_who, _amount);
				return;
			}
		}

		revert(); // if not found!
	}	

	function stringHash(string _s) public pure returns(bytes32) {
		return keccak256(abi.encodePacked(_s));
	}

	function getProposalVotingResults(DaoStorage _daoStorage, address _p) public view returns (bool isVotingFound, bool votingResult) {
		// scan all votings and search for the one that is finished
		for(uint i=0; i<DaoStorage(_daoStorage).getProposalsCount(); ++i) {
			if(DaoStorage(_daoStorage).getProposalAtIndex(i) == _p) {
				IVoting voting = DaoStorage(_daoStorage).getProposalAtIndex(i).getVoting();
				return (true, voting.isFinished() && voting.isYes());
			}
		}

		return (false, false);
	}
}
