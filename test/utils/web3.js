const pify = require('pify');

const ethAsync = pify(web3.eth);
module.exports = (contract) => {
 const ethGetBalance = ethAsync.getBalance;
 const ethSendTransaction = ethAsync.sendTransaction;
 const ethGetBlock = ethAsync.getBlock;

 return {
        ethGetBalance: ethGetBalance,
        ethSendTransaction: ethSendTransaction,
		ethGetBlock: ethGetBlock
    };
}