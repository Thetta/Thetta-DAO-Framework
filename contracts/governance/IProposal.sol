pragma solidity ^0.4.15;

import './IVoting.sol';
import '../IMicrocompany.sol';

interface IProposal {
	function action(IMicrocompany _mc, IVoting _voting)public;
	function getVoting()public constant returns(address vote);
}

