var Microcompany = artifacts.require("./Microcompany");
var MicrocompanyStorage = artifacts.require("./MicrocompanyStorage");

// 2 - Functions
deployMc = () => {
     var mc;

     return Microcompany.new(0x0,{gas: 10000000}).then((out) => {
          mc = out;
     }).then(() => {
          return Promise.resolve(mc);
     });
}

global.contract('Microcompany', (accounts) => {
	let mcStorage;
	let mcInstance;

	global.beforeEach(async() => {
		mcStorage = await MicrocompanyStorage.new({gas: 10000000});
		const mcStorageAddress = mcStorage.address;

		mcInstance = await Microcompany.new(mcStorageAddress,{gas: 10000000});
	});

	global.it('should return correct permissions',async() => {
		const isCan = await mcStorage.isCanDoByEmployee("addNewVote");
		global.assert.strictEqual(isCan,true,'Permission should be set correctly');
	});

});

