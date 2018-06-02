pragma solidity ^0.4.15;

import '../DaoBase.sol';
import '../tokens/StdDaoToken.sol';

import '../DaoBaseAuto.sol';

//import "../utils/GenericCaller.sol";

// for GenericCallerTEST
import "../governance/IVoting.sol";
import "../governance/Voting.sol";

import "../governance/Proposals.sol";

/*
contract OutOfGasTEST {
	StdDaoToken public token;
	DaoStorage public store;
	DaoBase public daoBase;
	//AutoTEST public aac;

	DaoBaseAuto aac;
	
	function OutOfGasTEST() public {
	   token = new StdDaoToken("StdToken", "STDT", 18);
		store = new DaoStorage(token);
		daoBase = new DaoBase(store);

		//aac = new AutoTEST(IDaoBase(daoBase));

		aac = new DaoBaseAuto(IDaoBase(daoBase));
	}
}
*/
