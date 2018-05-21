pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./governance/Voting.sol";
import "./moneyflow/WeiExpense.sol";
import "./moneyflow/IMoneyflow.sol";

contract GenericProposal is IProposal {
	Voting voting;

	address target;
	string methodSig;
	bytes32[] params;

	function GenericProposal(IMicrocompanyBase _mc, address _target, address _origin, string _methodSig, bytes32[] _params) public {
		target = _target;
		params = _params;
		methodSig = _methodSig;

		// TODO: remove default parameters, let Vote to read data in its constructor
		// each employee has 1 vote 
		// 
		// _origin is the initial msg.sender (just like tx.origin) 
		voting = new Voting(_mc, this, _origin, Voting.VoteType.EmployeesVote, 24 *60, 0x0);
	}

// IVoting implementation
	function action(IMicrocompanyBase _mc, IVoting _voting) public {
		// cool! voting is over and the majority said YES -> so let's go!
		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		target.call(
			bytes4(keccak256(methodSig)),
			uint256(32),				// pointer to the length of the array
			uint256(params.length), // length of the array
			params);						// array itself
	}

	function getVoting()public constant returns(IVoting){
		return voting;
	}
}

// This is a wrapper that help us to do action that CAN require votings
// WARNING: should be permitted to add new proposal by the current Microcompany!!!
contract GenericCaller {
	IMicrocompanyBase mc;

	function GenericCaller(IMicrocompanyBase _mc)public{
		mc = _mc;
	}

	// _actionId is something like "issueTokens"
	// _methodSig some kind of "issueTokens(bytes32[])"
	function doAction(string _permissionsId, address _target, address _origin, string _methodSig, bytes32[] _params) public returns(address proposalOut) 
	{
		if(mc.isCanDoAction(msg.sender, _permissionsId)){
			// 1 - call immediately?
			_target.call(
				bytes4(keccak256(_methodSig)),
				uint256(32),				// pointer to the length of the array
				uint256(_params.length), // length of the array
				_params);						// array itself

			return 0x0;
		}else{
			// 2 - create new vote instead
			GenericProposal prop = new GenericProposal(mc, _target, _origin, _methodSig, _params);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			mc.addNewProposal(prop);		
			return prop;
		}
	}
}

// This contract is a helper that will create new Proposal (i.e. voting) if the action is not allowed directly
contract AutoMicrocompanyActionCaller is GenericCaller {
	function AutoMicrocompanyActionCaller(IMicrocompanyBase _mc)public
		GenericCaller(_mc)
	{
	}

	function issueTokensAuto(address _to, uint _amount) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_to);
		params[1] = bytes32(_amount);

	   doAction("issueTokens", mc, msg.sender,"issueTokensGeneric(bytes32[])",params);
	}

	function upgradeMicrocompanyContractAuto(address _newMc) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);

		doAction("upgradeMicrocompanyContract", mc, msg.sender,"upgradeMicrocompanyContractGeneric(bytes32[])",params);
	}
}

// TODO: add tests!
contract AutoMoneyflowActionCaller is GenericCaller {
	IMoneyflowScheme mfs;

	function AutoMoneyflowActionCaller(IMicrocompanyBase _mc, IMoneyflowScheme _mfs)public 
		GenericCaller(_mc)	
	{
		mfs = _mfs;
	}

	function addNewTask(WeiAbsoluteExpense _wt) public returns(address voteOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(address(_wt));

	   doAction("addNewTask", mc, msg.sender,"addNewTaskGeneric(bytes32[])",params);
	}
}

