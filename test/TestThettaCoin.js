pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/ThettaCoin.sol";

contract TestMetacoin {

  function testInitialBalanceUsingDeployedContract() {
    ThettaCoin meta = ThettaCoin(DeployedAddresses.ThettaCoin());

    uint expected = 10000;

    Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 ThettaCoin initially");
  }

  function testInitialBalanceWithNewThettaCoin() {
    ThettaCoin meta = new ThettaCoin();

    uint expected = 10000;

    Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 ThettaCoin initially");
  }

}
