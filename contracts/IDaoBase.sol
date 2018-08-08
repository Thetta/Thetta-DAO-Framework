pragma solidity ^0.4.22;

import "./governance/IProposal.sol";


/**
 * @title IDaoObserver, can be called IDaoClient really.
 * @dev Also, see DaoClient contract below.
 */
contract IDaoObserver {
	function onUpgrade(address _newAddress) public;
}


/**
 * @title This is the base interface that you should use.
 * @dev Derive your DAO from it and provide the method implementation or 
 * see DaoBase contract that implements it.
 */
contract IDaoBase {
	function addObserver(IDaoObserver _observer)public;
	function upgradeDaoContract(IDaoBase _new)public;

// Groups
	function addGroupMember(string _groupName, address _a) public;
	function removeGroupMember(string _groupName, address _a) public;
	function getMembersCount(string _groupName) public view returns(uint);
	function isGroupMember(string _groupName,address _a)public view returns(bool);
	function getMemberByIndex(string _groupName, uint _index) public view returns (address);

// Permissions
	function allowActionByShareholder(bytes32 _what, address _tokenAddress) public;
	function allowActionByVoting(bytes32 _what, address _tokenAddress) public;
	function allowActionByAddress(bytes32 _what, address _a) public;
	function allowActionByAnyMemberOfGroup(bytes32 _what, string _groupName) public;

	function isCanDoAction(address _a, bytes32 _permissionName)public view returns(bool);

// Tokens
	// ???? TODO: needed
	//function addTokenAddressToList();
	function issueTokens(address _tokenAddress, address _to, uint amount)public;
	function burnTokens(address _tokenAddress, address _who, uint amount)public;

// Governance/Proposals
	function addNewProposal(IProposal _proposal) public;
	function getProposalAtIndex(uint _i)public view returns(IProposal);
	function getProposalsCount()public view returns(uint);
}


/**
 * @title DaoClient, just an easy-to-use wrapper.
 * @dev This contract provides you with internal 'dao' variable. 
 * Once your DAO controller is upgraded -> all DaoClients will be notified and 'dao' var will be updated automatically.
 *
 * Some contracts like Votings or Auto-callers has 'dao' variable and don't use DaoClient.
 * In this case they will stop working if the controller (DAO) is upgraded (it is as inteded).
 */
contract DaoClient is IDaoObserver {
	IDaoBase dao;

	modifier isCanDo(bytes32 _what){
		require(dao.isCanDoAction(msg.sender, _what)); 
		_; 
	}

	constructor(IDaoBase _dao) public {
		dao = _dao;
		dao.addObserver(this);
	}

	/**
	 * @dev If your company is upgraded -> then this will automatically update the current dao.
	 * dao will point at NEW contract!
	 * @param _newAddress New controller.
	 */
	function onUpgrade(address _newAddress) public {
		require(msg.sender==address(dao));

		dao = IDaoBase(_newAddress);

		// this is not needed because we are already in the list of observers (in the store) 
		// and the controller is upgraded only
		//dao.addObserver(this);
	}
}
