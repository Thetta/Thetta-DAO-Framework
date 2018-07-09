# Thetta DAO Framework (for Developers)

Please [submit issues here](https://github.com/Thetta/Thetta-DAO-Framework/projects/1).

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[ ![Codeship Status for Thetta/SmartContracts](https://app.codeship.com/projects/f1b38150-b26e-0135-0584-462fcae7d1c8/status?branch=master)](https://app.codeship.com/projects/258076)

## Branches 

1. **master** is for releases only
1. **dev** is for testing 
1. **dev2** is for development

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
npm install -g npm@6.1.0
nvm install 10.5.0
npm install -g ganache-cli

# solc is 0.4.23
# zeppelin-solidity is 1.9.0
npm install -g truffle@4.1.12

# test
npm run test

# coverage via coveralls.io
npm run coveralls
```
