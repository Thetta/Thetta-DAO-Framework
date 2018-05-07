pragma solidity ^0.4.15;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";

import "./ThrowProxy.sol";
import "../contracts/Microcompany.sol";

contract FakeAccount {

}

contract TestMicrocompany {
	function testPermissions() public {
		StdMicrocompanyToken stdToken = new StdMicrocompanyToken();

		Microcompany mc = new Microcompany(0);
		Assert.isTrue(mc.isCanDoByEmployee("addNewVote"),"addNewTask should be added");
		// TODO: add more test
	}

	/*
	function testAddNewEmployee(){
		FakeAccount fa = new FakeAccount();

		Microcompany mc = new Microcompany();
		ThrowProxy throwProxy = new ThrowProxy(address(mc));
		Assert.isTrue(mc.isInMajority(this), "should be in majority of token holders");

		Microcompany(address(throwProxy)).addNewEmployee(fa);
		bool r = throwProxy.execute.gas(4000000)();
		Assert.isTrue(r, "Should not throw because i have >51% of gov. tokens!");
	}
  */
}
