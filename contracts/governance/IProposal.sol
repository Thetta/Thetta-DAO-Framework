pragma solidity ^0.4.15;

import './IVoting.sol';
import '../IMicrocompany.sol';

interface IProposal {
	function action(IDaoBase _mc, IVoting _voting)public;
	function getVoting()public constant returns(IVoting voting);

	// ???
	// function isOpen() public constant returns(bool);
}

