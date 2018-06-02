# Thetta DAO Framework 

Thetta DAO Framework is a DAO Framework that will help you to create your own DAO on top of it.
Code is modular, so you can use different subsystems almost independently.

Please [submit issues here](https://github.com/Thetta/SmartContracts/projects/1?).

[ ![Codeship Status for Thetta/SmartContracts](https://app.codeship.com/projects/f1b38150-b26e-0135-0584-462fcae7d1c8/status?branch=master)](https://app.codeship.com/projects/258076)

## Branches 
**master** is for releases only
**dev** is for testing 
**dev2** is for development

## Testing  

```
npm run test
```

## Testing specific file

```
npm run test -- test/moneyflow_tests.js
````

## CodeShip Continuous Integration script
``` bash
# reqs
npm install -g npm@5.5.1
nvm install 8.9.3
npm install -g ethereumjs-testrpc

# solc is 0.4.21
# zeppelin-solidity is 1.9.0
npm install -g truffle@4.1.7

# test
npm run test
```
