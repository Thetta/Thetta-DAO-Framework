pragma solidity ^0.4.22;

import "./DaoStorageGroups.sol";
import "./governance/IProposal.sol";
import "./tokens/StdDaoToken.sol";
import "./IDaoObserver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title DaoStorage
 * @dev This is the basic contract that keeps all data. It is used by DaoBase (controller) on top.
 * The controller can be updated but the storage will be kept intact.
 *
 * Storage works with bytes32 instead of strings. DaoBase converts strings to bytes32 by hashing (keccak256)
*/
contract DaoStorage is DaoStorageGroups {
	// owner of DaoStorage will be the Dao (DaoBase)
	// owner of tokens will be the Dao (DaoBase)
	StdDaoToken[] public tokens;
	IProposal[] public proposals;
	address[] public observers;

	// token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byShareholder;
	// token -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byVoting;
	// address -> permission -> flag
	mapping (address=>mapping(bytes32=>bool)) byAddress;

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
	constructor(address[] _tokens) public {
		for(uint i=0; i<_tokens.length; ++i) {
			tokens.push(StdDaoToken(_tokens[i]));
		}

		// WARNING: please! do not forget to transfer the token 
		// ownership to the Dao (i.e. DaoBase or any derived contract)
		// Like this:
		//
		// token.transferOwnership(daoBase);
	}

	function addObserver(IDaoObserver _observer) public {
		observers.push(_observer);
	}

	function getObserverCount() external view returns(uint) {
		return observers.length;
	}

	function getObserverAtIndex(uint _index) external view returns(address) {
		return observers[_index];
	}

	// Permissions:
	function allowActionByAnyMemberOfGroup(bytes32 _what, bytes32 _groupName) public onlyOwner {
		isAllowedActionByGroupMember[_groupName][_what] = true;
	}

	function isCanDoByGroupMember(bytes32 _what, address _a /*, bytes32 _groupName*/) public view returns(bool) {
		uint len = addressToGroups[_a].length;

		// enumerate all groups that _a belongs to
		for(uint i=0; i<len; ++i){
			bytes32 groupName = addressToGroups[_a][i];
			if(isAllowedActionByGroupMember[groupName][_what]) {
				return true;
			}
		}
		return false; 
	}

	//////
	function allowActionByShareholder(bytes32 _what, address _tokenAddress) public onlyOwner {
		byShareholder[_tokenAddress][_what] = true;
	}

	function allowActionByVoting(bytes32 _what, address _tokenAddress) public onlyOwner {
		byVoting[_tokenAddress][_what] = true;
	}

	function allowActionByAddress(bytes32 _what, address _a) public onlyOwner {
		byAddress[_a][_what] = true;
	}

	function isCanDoByShareholder(bytes32 _permissionName, address _tokenAddress) public view returns(bool) {
		return byShareholder[_tokenAddress][_permissionName];
	}

	function isCanDoByVoting(bytes32 _permissionName, address _tokenAddress) public view returns(bool) {
		return byVoting[_tokenAddress][_permissionName];
	}

	function isCanDoByAddress(bytes32 _permissionName, address _a) public view returns(bool) {
		return byAddress[_a][_permissionName];
	}

// Vote:
	function addNewProposal(IProposal _proposal) public onlyOwner {
		proposals.push(_proposal);
	}

	function getProposalAtIndex(uint _i)public view returns(IProposal) {
		require(_i<proposals.length);
		return proposals[_i];
	}

	function getProposalsCount()public view returns(uint) {
		return proposals.length;
	}

	function getProposalVotingResults(address _p) public view returns (bool isVotingFound, bool votingResult) {
		// scan all votings and search for the one that is finished
		for(uint i=0; i<proposals.length; ++i) {
			if(proposals[i]==_p) {
				IVoting voting = proposals[i].getVoting();
				return (true, 	voting.isFinished() && voting.isYes());
			}
		}
		return (false,false);
	}

	function getAllTokenAddresses() public view returns (StdDaoToken[]) {
		return tokens;
	}
}
