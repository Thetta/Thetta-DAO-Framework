pragma solidity ^0.4.15;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

//import '../DaoBaseAuto.sol';

//import "../utils/GenericCaller.sol";

// for GenericCallerTEST
import "../governance/Voting.sol";
import "../governance/IProposal.sol";

contract GenericProposalTEST is IProposal, Ownable {
	IVoting voting;

	address target;
	string methodSig;
	bytes32[] params;

	function GenericProposalTEST(address _target, address _origin, string _methodSig, bytes32[] _params) public {
		target = _target;
		params = _params;
		methodSig = _methodSig;
	}

// IVoting implementation
	function action(IDaoBase _mc, IVoting _voting) public {
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
			emit GenericCaller_DoActionDirectly(_permissionId);

			// 1 - call immediately?
			_target.call(
				bytes4(keccak256(_methodSig)),
				uint256(32),						 // pointer to the length of the array
				uint256(_params.length),		 // length of the array
				_params	
			);					

			return 0x0;
		}else{
			// 2 - create proposal + voting first  
			emit GenericCaller_CreateNewProposal(_permissionId);

			// _origin is the initial msg.sender (just like tx.origin) 
			//GenericProposalTEST prop = new GenericProposalTEST(_target, _origin, _methodSig, _params);

			// TODO: uncomment 
			//IVoting voting = createVoting(_permissionId, prop, _origin);

			IProposal prop = IProposal(0x0);

			IVoting voting = new Voting_1p1v(mc, prop, _origin, 24 * 60, keccak256("Employees"), bytes32(0));
			//prop.setVoting(voting);

			// WARNING: should be permitted to add new proposal by the current contract address!!!
			// check your permissions or see examples (tests) how to do that correctly
			mc.addNewProposal(prop);		
			return prop;
		}
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
	
	function OutOfGasTEST() public {
	   token = new StdDaoToken("StdToken", "STDT", 18);
		store = new DaoStorage(token);
		daoBase = new DaoBase(store);

		aac = new AutoTEST(IDaoBase(daoBase));
	}

}
