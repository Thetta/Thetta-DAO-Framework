pragma solidity ^0.4.4;


contract Migrations {
	address public owner;
	uint public lastCompletedMigration;

	modifier restricted() {
		if (msg.sender == owner) {
			_;
		}
	}

	constructor() public{
		owner = msg.sender;
	}

	function setCompleted(uint _completed) external restricted {
		lastCompletedMigration = _completed;
	}

	function upgrade(address _newAddress) external restricted {
		Migrations upgraded = Migrations(_newAddress);
		upgraded.setCompleted(lastCompletedMigration);
	}
}
