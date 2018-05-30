pragma solidity ^0.4.15;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

//import '../DaoBaseAuto.sol';

import "../utils/GenericCaller.sol";

// for GenericCallerTEST
import "../governance/IVoting.sol";

import "../governance/Proposals.sol";

contract Voting_1p1vTEST is IVoting, Ownable {
	IDaoBase mc;
	IProposal proposal; 
	bool isCalled = false;
	uint public minutesToVote;

////////
	bytes32 groupHash;

	address[] employeesVotedYes;
	address[] employeesVotedNo;

////////
	// we can use _origin instead of tx.origin
	function Voting_1p1vTEST(IDaoBase _mc, IProposal _proposal, 
								address _origin, 
								uint _minutesToVote, bytes32 _groupHash, bytes32 _emptyParam) public 
	{
		mc = _mc;
		proposal = _proposal;
		minutesToVote = _minutesToVote;

		groupHash = _groupHash;

		internalVote(_origin, true);
	}

	function isYes()public constant returns(bool){
		var(yesResults, noResults, totalResults) = getFinalResults();

		// TODO: calculate results
		// TODO: JUST FOR DEBUGGGGG!!!
		return (yesResults > totalResults/2) && (totalResults>1);
	}

	function isFinished()public constant returns(bool){
		// TODO: calculate results
		// TODO: JUST FOR DEBUGGGGG!!!
		var(yesResults, noResults, totalResults) = getFinalResults();
		return (totalResults>1);
	}

	function cancelVoting() public onlyOwner {
		// TODO:
	}
	
	function vote(bool _yes, uint _tokenAmount) public {
		require(!isFinished());

		internalVote(msg.sender, _yes);
	}

	function internalVote(address _who, bool _yes) internal {
		require(mc.isGroupMemberByHash(groupHash, _who));

		if(_yes){
			employeesVotedYes.push(_who);
		}else{
			employeesVotedNo.push(_who);
		}

		callActionIfEnded();
	}

	function callActionIfEnded() public {
		if(!isCalled && isFinished() && isYes()){
			// should not be callable again!!!
			isCalled = true;

			// can throw!
			proposal.action(mc, this);
		}
	}

	function getFinalResults() public constant returns(uint yesResults, uint noResults, uint totalResults){
		// employees could be fired or added IN THE MIDDLE of the voting 
		//
		// so here we should iterate again over all microcompany employees and check if they voted yes or no 
		// each employee has 1 vote 
		yesResults = employeesVotedYes.length;
		noResults = employeesVotedNo.length;
		totalResults = yesResults + noResults;
	}
}

contract GenericCallerTEST is DaoClient, Ownable {
	enum VotingType {
		NoVoting,

		Voting1p1v,
		VotingSimpleToken,
		VotingQuadratic
	}

	struct VotingParams {
		VotingType votingType;
		bytes32 param1;
		bytes32 param2;
		bytes32 param3;
	}

	mapping (bytes32=>VotingParams) votingParams;

	event GenericCaller_DoActionDirectly(string permission);
	event GenericCaller_CreateNewProposal(string permission);

/////
	function GenericCallerTEST(IDaoBase _mc)public
		// DaoClient (for example) helps us to handle DaoBase upgrades
		// and will automatically update the 'mc' to the new instance
		DaoClient(_mc)	
	{
	}

	// _actionId is something like "issueTokens"
	// _methodSig some kind of "issueTokens(bytes32[])"
	function doAction(string _permissionId, address _target, address _origin, string _methodSig, bytes32[] _params) public returns(address proposalOut) 
	{
		if(mc.isCanDoAction(msg.sender, _permissionId)){
			return doActionDirectly(_permissionId, _target, _origin, _methodSig, _params);
		}else{
			return doActionWithVoting(_permissionId, _target, _origin, _methodSig, _params);
		}
	}

	function doActionDirectly(string _permissionId, address _target, address _origin, 
									  string _methodSig, bytes32[] _params) internal returns(address proposalOut) {
		//emit GenericCaller_DoActionDirectly(_permissionId);

		// 1 - call immediately?
		_target.call(
			bytes4(keccak256(_methodSig)),
			uint256(32),						 // pointer to the length of the array
			uint256(_params.length),		 // length of the array
			_params	
		);					

		return 0x0;
	}

	function doActionWithVoting(string _permissionId, address _target, address _origin, 
										 string _methodSig, bytes32[] _params) internal returns(address proposalOut) {

		// 2 - create proposal + voting first  
		//emit GenericCaller_CreateNewProposal(_permissionId);

		GenericProposal prop = new GenericProposal(_target, _origin, _methodSig, _params);

		// TODO: uncomment 
		// IVoting voting = IVoting(0x0);
		// IVoting voting = createVoting(_permissionId, prop, _origin);

		Voting_1p1vTEST voting = new Voting_1p1vTEST(mc, IProposal(0x0), _origin, 
	    															24 * 60, keccak256("Employees"), bytes32(0));

		prop.setVoting(voting);

		// WARNING: should be permitted to add new proposal by the current contract address!!!
		// check your permissions or see examples (tests) how to do that correctly
		mc.addNewProposal(prop);		
		return prop;
	}

	function setVotingParams(string _permissionId, uint _votingType, 
									 bytes32 _param1, bytes32 _param2, bytes32 _param3) public onlyOwner {
		VotingParams memory params;
		params.votingType = VotingType(_votingType);
		params.param1 = _param1;
		params.param2 = _param2;
		params.param3 = _param3;

		votingParams[keccak256(_permissionId)] = params;
	}

	function createVoting(string _permissionId, IProposal _proposal, address _origin)internal returns(IVoting){
		VotingParams memory vp = votingParams[keccak256(_permissionId)];

		if(VotingType.Voting1p1v==vp.votingType){
			return new Voting_1p1v(mc, _proposal, _origin, uint(vp.param1), vp.param2, vp.param3);
		}

		if(VotingType.VotingSimpleToken==vp.votingType){
			// TODO: test
			return new Voting_SimpleToken(mc, _proposal, _origin, uint(vp.param1), address(vp.param2), vp.param3);
		}

		// TODO: add other implementations
		// no implementation for this type!
		assert(false==true);
		return IVoting(0x0);
	}
}

////////////////////////////////////////////////
// this is a copy of AutoDaoBaseActionCaller
contract AutoTEST is GenericCallerTEST {
	IDaoBase mc;

	function AutoTEST(IDaoBase _mc)public
		GenericCallerTEST(_mc)
	{

	}

	function addGroupMemberAuto(string _group, address _a) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(keccak256(_group));
		params[1] = bytes32(_a);

	   return doAction("manageGroups", mc, msg.sender,"addGroupMemberGeneric(bytes32[])",params);
	}

	function issueTokensAuto(address _to, uint _amount) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](2);
		params[0] = bytes32(_to);
		params[1] = bytes32(_amount);

	   return doAction("issueTokens", mc, msg.sender,"issueTokensGeneric(bytes32[])",params);
	}

	function upgradeDaoContractAuto(address _newMc) public returns(address proposalOut){
		bytes32[] memory params = new bytes32[](1);
		params[0] = bytes32(_newMc);

		return doAction("upgradeDaoContract", mc, msg.sender,"upgradeDaoContractGeneric(bytes32[])",params);
	}
}

contract OutOfGasTEST {
	StdDaoToken public token;
	DaoStorage public store;
	DaoBase public daoBase;
	AutoTEST public aac;

	//AutoDaoBaseActionCaller aac;
	
	function OutOfGasTEST() public {
	   token = new StdDaoToken("StdToken", "STDT", 18);
		store = new DaoStorage(token);
		daoBase = new DaoBase(store);

		aac = new AutoTEST(IDaoBase(daoBase));

		//aac = new AutoDaoBaseActionCaller(IDaoBase(daoBase));
	}

}
