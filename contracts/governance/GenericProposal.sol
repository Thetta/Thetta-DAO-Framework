pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../IDaoBase.sol";
import "../governance/IVoting.sol";


/**
 * @title GenericProposal 
 * @dev This is the implementation of IProposal interface. Each Proposal should have voting attached. 
 * This is an auto proposal that is used by GenericCaller to call actions on a _target 
 * Used by GenericCaller, DaoBaseAuto, MoneyflowAuto, etc
*/
contract GenericProposal is IProposal, Ownable {
	IVoting voting;

	address target;
	string methodSig;
	bytes32[] params;

	constructor(address _target, address _origin, string _methodSig, bytes32[] _params) public {
		target = _target;
		params = _params;
		methodSig = _methodSig;
		if(_origin==0x0) {
			revert();
		}
	}

	event GenericProposalAction(IVoting _voting, address _target, string _methodSig, bytes32[] _params);

	// IVoting implementation
	/**
	* @dev action which will be called if voting finished with yes
	*/
	function action() public {
		emit GenericProposalAction(
			voting, 
			target, 
			methodSig, 
			params
		);

		// in some cases voting is still not set
		if(0x0!=address(voting)) {
			require(msg.sender==address(voting));
		}

		params.push(bytes32(address(voting)));
		
		// cool! voting is over and the majority said YES -> so let's go!
		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		if(!address(target).call(
			bytes4(keccak256(methodSig)),
			uint256(32),				// pointer to the length of the array
			uint256(params.length), // length of the array
			params)
		){
			revert();
		}
	}

	/**
	* @notice This function should be called only by owner
	* @param _voting voting instance (address)
	* @dev this function sets voting to proposal
	*/
	function setVoting(IVoting _voting) public onlyOwner {
		voting = _voting;
	}

	/**
	* @return voting address
	*/
	function getVoting() public view returns(IVoting) {
		return voting;
	}

	/**
	* @return signature of method which will be called after voting finished
	*/
	function getMethodSig() public view returns(string) {
		return methodSig;
	}

	/**
	* @return params for method which will be called after voting finished
	*/
	function getParams() public view returns(bytes32[]) {
		return params;
	}
}
