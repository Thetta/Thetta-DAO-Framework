pragma solidity ^0.4.15;

interface IProposal {
	function action()public;
	function getVote()public constant returns(address vote);
}

