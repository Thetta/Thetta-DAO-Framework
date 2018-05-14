pragma solidity ^0.4.15;

interface IProposal {
	function action()public;
	function getVoting()public constant returns(address vote);
}

