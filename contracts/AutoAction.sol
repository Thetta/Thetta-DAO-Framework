pragma solidity ^0.4.15;

import "./IMicrocompany.sol";

import "./governance/Voting.sol";
import "./moneyflow/WeiExpense.sol";
import "./moneyflow/IMoneyflow.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract GenericProposal is IProposal, Ownable {
	IVoting voting;

	address target;
	string methodSig;
	bytes32[] params;

	function GenericProposal(address _target, address _origin, string _methodSig, bytes32[] _params) public {
		target = _target;
		params = _params;
		methodSig = _methodSig;
	}

// IVoting implementation
	function action(IMicrocompanyBase _mc, IVoting _voting) public {
		require(address(voting)!=0x0);
		require(msg.sender==address(voting));

		// cool! voting is over and the majority said YES -> so let's go!
		// as long as we call this method from WITHIN the vote contract 
		// isCanDoAction() should return yes if voting finished with Yes result
		target.call(
			bytes4(keccak256(methodSig)),
			uint256(32),				// pointer to the length of the array
			uint256(params.length), // length of the array
			params);						// array itself
	}

	function setVoting(IVoting _voting) public onlyOwner{
		voting = _voting;
	}

	function getVoting()public constant returns(IVoting){
		return voting;
	}
}

// This is a wrapper that help us to do action that CAN require votings
// WARNING: should be permitted to add new proposal by the current Microcompany!!!
contract GenericCaller {
	// If your company is upgraded -> then you can throw out your GenericCaller and create new one
	// no need to update the GenericCaller (at least now, because it does not store any data)
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
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params	
			);					

			/*
			// Delegatecall: 
			// 1. _target storage will be set to THIS contract
			// 2. msg.sender will be set to THE CURRENT msg.sender!
			_target.delegatecall(
				bytes4(keccak256(_methodSig)),
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params	
			);					
		   */

			return 0x0;
		}else{
			// 2 - create proposal + voting first  

			// _origin is the initial msg.sender (just like tx.origin) 
			GenericProposal prop = new GenericProposal(_target, _origin, _methodSig, _params);

			IVoting voting = createVoting(_permissionsId, prop, _origin);
			prop.setVoting(voting);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			// check your permissions or see examples (tests) how to do that correctly
			mc.addNewProposal(prop);		
			return prop;
		}
	}

	function createVoting(string _permissionsId, IProposal _prop, address _origin)internal returns(IVoting){
		// TODO: make Voting factory. I.e., vote type should depend on what is the _permissionsId
		return new Voting(mc, _prop, _origin, Voting.VoteType.EmployeesVote, 24 *60, 0x0);
	}
}

// This contract is a helper that will create new Proposal (i.e. voting) if the action is not allowed directly
contract AutoMicrocompanyActionCaller is GenericCaller {
	function AutoMicrocompanyActionCaller(IMicrocompanyBase _mc)public
		GenericCaller(_mc)
	{
	}

	function addGroupMemberAuto(string _group, address _a) public returns(address proposalOut){
		// TODO: implement 
		assert(false);

		/*
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_group);
		params[1] = bytes32(_a);

	   return doAction("manageGroups", mc, msg.sender,"addGroupMemberGeneric(bytes32[])",params);
	   */
	}

	function issueTokensAuto(address _to, uint _amount) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_to);
		params[1] = bytes32(_amount);

	   return doAction("issueTokens", mc, msg.sender,"issueTokensGeneric(bytes32[])",params);
	}

	function upgradeMicrocompanyContractAuto(address _newMc) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);

		return doAction("upgradeMicrocompanyContract", mc, msg.sender,"upgradeMicrocompanyContractGeneric(bytes32[])",params);
	}
}

// TODO: add tests!
contract AutoMoneyflowActionCaller is GenericCaller {
	IMoneyflow mf;

	function AutoMoneyflowActionCaller(IMicrocompanyBase _mc, IMoneyflow _mf)public 
		GenericCaller(_mc)	
	{
		mf = _mf;
	}

	function addNewTask(WeiAbsoluteExpense _wt) public returns(address voteOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(address(_wt));

		return doAction("addNewTask", mf, msg.sender,"addNewTaskGeneric(bytes32[])",params);
	}

	function setRootWeiReceiverAuto(WeiAbsoluteExpense _wt) public returns(address voteOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(address(_wt));

		return doAction("setRootWeiReceiver", mf, msg.sender,"setRootWeiReceiverGeneric(bytes32[])",params);
	}

	function withdrawDonationsToAuto(address _wt) public returns(address voteOut){
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_wt);

		return doAction("withdrawDonations", mf, msg.sender,"withdrawDonationsToGeneric(bytes32[])",params);
	}
}

