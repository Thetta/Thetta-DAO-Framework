pragma solidity ^0.4.22;

import './governance/IProposal.sol';

/**
 * @title IDaoObserver, can be called IDaoClient really.
 * @dev Also, see DaoClient contract below.
 */
interface IDaoObserver {
	function onUpgrade(address _newAddress) external;
}

/**
 * @title This is the base interface that you should use.
 * @dev Derive your DAO from it and provide the method implementation or 
 * see DaoBase contract that implements it.
 */
interface IDaoBase {
	function addObserver(IDaoObserver _observer)external;
	function upgradeDaoContract(IDaoBase _new)external;

// Groups
	function addGroupMember(string _groupName, address _a) external;
	function removeGroupMember(string _groupName, address _a) external;
	function getMembersCount(string _groupName) external constant returns(uint);
	function isGroupMember(string _groupName,address _a)external constant returns(bool);
	function getMemberByIndex(string _groupName, uint _index) external view returns (address);

// Permissions
	function allowActionByShareholder(bytes32 _what, address _tokenAddress) external;
	function allowActionByVoting(bytes32 _what, address _tokenAddress) external;
	function allowActionByAddress(bytes32 _what, address _a) external;
	function allowActionByAnyMemberOfGroup(bytes32 _what, string _groupName) external;

	function isCanDoAction(address _a, bytes32 _permissionName)external constant returns(bool);

// Tokens
	// ???? TODO: needed
	//function addTokenAddressToList();
	function issueTokens(address _tokenAddress, address _to, uint amount)external;
	function burnTokens(address _tokenAddress, address _who, uint amount)external;

// Governance/Proposals
	function addNewProposal(IProposal _proposal) external;
	function getProposalAtIndex(uint _i)external constant returns(IProposal);
	function getProposalsCount()external constant returns(uint);
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
	function onUpgrade(address _newAddress) external {
		require(msg.sender==address(dao));

		dao = IDaoBase(_newAddress);

		// this is not needed because we are already in the list of observers (in the store) 
		// and the controller is upgraded only
		//dao.addObserver(this);
	}
}
