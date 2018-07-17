pragma solidity ^0.4.22;

import './IVoting.sol';
import '../IDaoBase.sol';

/**
 * @title IProposal 
 * @dev This is the basic DAO Proposal interface. Each Proposal should have voting attached. 
 * Proposal can do some action if voting is finished with 'yes' result. Or action can be empty. 
*/
contract IProposal {
	function action()public;
	function getVoting()public view returns(IVoting voting);

	// ???
	// function isOpen() public constant returns(bool);
}

