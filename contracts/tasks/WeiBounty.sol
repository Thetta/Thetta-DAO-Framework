pragma solidity ^0.4.23;

import "./WeiGenericTask.sol";


/**
 * @title WeiBounty 
 * @dev Bounty is when you put money, then someone outside the DAO works
 * That is why bounty is always prepaid 
*/
contract WeiBounty is WeiGenericTask {

	bytes32 constant public START_BOUNTY = keccak256("startBounty");
	
	constructor(IDaoBase _dao, string _caption, string _desc, uint _neededWei, uint64 _deadlineTime, uint64 _timeToCancell) public 
		WeiGenericTask(_dao, _caption, _desc, false, false, _neededWei, _deadlineTime, _timeToCancell) 
	{
	}

	// callable by anyone
	function startTask() public isCanDo(START_BOUNTY) {
		require(getCurrentState() == State.PrePaid);
		startTime = block.timestamp;
		employee = msg.sender;
		state = State.InProgress;
		emit WeiGenericTaskStateChanged(state);
	}
}