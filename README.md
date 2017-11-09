# Thetta smart contracts

## Running
truffle test

## CodeShip Continuous Integration script
``` bash
# reqs
npm install -g npm@3.10.10
nvm install 6.10.3
npm install -g ethereumjs-testrpc
npm install -g truffle@v4.0.0-beta.2

# test
nohup bash -c "testrpc --port 8989 --gasLimit 10000000 2>&1 &"
truffle test
```
