async function linkContractsWithLibrary(deployer, artifacts, lib, contractNames) {
     for(let contractName of contractNames) {
          try {
               await deployer.link(lib, artifacts.require(contractName));
          } catch(error) {
               console.log('Not linked:', contractName);
          }
     }  
}

let thettaContracts = [ 
  "./DaoBase",
  "./DaoBaseAuto",
  "./DaoBaseImpersonated",
  "./DaoBaseMock",
  "./DaoBaseWithUnpackers",
  "./DaoBaseWithUnpackersMock", 
  "./DaoStorage",
  "./GenericCaller",
  "./MoneyflowAuto",
  "./StdDaoToken",
  "./Voting",
  "./VotingLib",
  "./GenericCallerLib"
]

function migrateLibs (artifacts, additionalContracts, deployer, network, accounts) {
     return deployer.then(async () => {    
          let contractsArr = thettaContracts.concat(additionalContracts);
          
          try {
               let UtilsLib = artifacts.require("./UtilsLib");
               await deployer.deploy(UtilsLib);
               await linkContractsWithLibrary(deployer, artifacts, UtilsLib, contractsArr);
          } catch(error) {
               console.log('Thetta.UtilsLib is not deployed');
          }

          try {
               let VotingLib = artifacts.require("./VotingLib");
               await deployer.deploy(VotingLib);
               await linkContractsWithLibrary(deployer, artifacts, VotingLib, contractsArr);
          } catch(error) {
               console.log('Thetta.VotingLib is not deployed');
          }

          try {
               let GenericCallerLib = artifacts.require("./GenericCallerLib");
               await deployer.deploy(GenericCallerLib);
               await linkContractsWithLibrary(deployer, artifacts, GenericCallerLib, contractsArr);
          } catch(error) {
               console.log('Thetta.GenericCallerLib is not deployed');
          }

          try {
               let DaoBaseLib = artifacts.require("./DaoBaseLib");
               await deployer.deploy(DaoBaseLib);
               await linkContractsWithLibrary(deployer, artifacts, DaoBaseLib, contractsArr);
          } catch(error) {
               console.log('Thetta.DaoBaseLib is not deployed');
          }          
     });
};

module.exports = migrateLibs