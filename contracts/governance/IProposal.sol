pragma solidity ^0.4.15;

import './IVoting.sol';
import '../IMicrocompany.sol';

interface IProposal {
	function action(IMicrocompanyBase _mc, IVoting _voting)public;
	function getVoting()public constant returns(address vote);
}

