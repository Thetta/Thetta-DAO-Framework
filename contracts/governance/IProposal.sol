pragma solidity ^0.4.22;

import './IVoting.sol';
import '../IDaoBase.sol';

interface IProposal {
	function action(IDaoBase _dao, IVoting _voting)public;
	function getVoting()public constant returns(IVoting voting);

	// ???
	// function isOpen() public constant returns(bool);
}

