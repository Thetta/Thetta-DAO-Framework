function migrateLibs (artifacts, additionalContracts, deployer, network, accounts) {

     return deployer.then(async () => {      
          var UtilsLib = artifacts.require("./UtilsLib");
          var GenericCallerLib = artifacts.require("./GenericCallerLib");
          var VotingLib = artifacts.require("./VotingLib");
          var DaoBaseLib = artifacts.require("./DaoBaseLib");

          async function linkIfExist(contractName){
               try {
                    await deployer.link(UtilsLib, artifacts.require(contractName));
                    await deployer.link(VotingLib, artifacts.require(contractName));
                    await deployer.link(GenericCallerLib, artifacts.require(contractName));
                    await deployer.link(DaoBaseLib, artifacts.require(contractName));
               } catch(error) {}
          }

          await deployer.deploy(UtilsLib);
          await deployer.link(UtilsLib, VotingLib);
          await deployer.deploy(VotingLib);
          await deployer.link(VotingLib, GenericCallerLib);
          await deployer.deploy(GenericCallerLib);
          await deployer.deploy(DaoBaseLib);

          contractsArr = [ "./DaoBaseImpersonated"
                         , "./DaoBaseWithUnpackers"
                         , "./GenericCaller"
                         , "./VotingLib"
                         , "./DaoBaseAuto"
                         , "./DaoBaseWithUnpackersMock"
                         , "./DaoBaseMock"
                         , "./DaoStorage"
                         , "./StdDaoToken"
                         , "./Voting"
                         , "./GenericCallerLib"
                         , "./GenericCaller"
                         , "./MoneyflowAuto"
                         , "./DaoBaseAuto"
                         , "./GenericCaller"
                         , "./MoneyflowAuto"
                         , "./DaoBaseAuto"
                         , "./DaoBase"
                         , "./DaoBaseWithUnpackers"
                         , "./DaoBaseWithUnpackersMock"
                         , "./DaoBaseMock"
                         ]

          contractsArr = contractsArr.concat(additionalContracts);

          for(let contract of contractsArr){
               await linkIfExist(contract);
          }

          
     });
};

module.exports = migrateLibs