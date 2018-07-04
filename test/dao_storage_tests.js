require('chai').use(require('chai-as-promised')).should();

const DaoStorage = artifacts.require("./DaoStorage");
const StdDaoToken = artifacts.require("./StdDaoToken");

contract("DaoStorage", (accounts) => {

	const creatorAddress = accounts[0];
	const userAddress = accounts[1];

	let store;
	let token;

	beforeEach(async () => {
		token = await StdDaoToken.new("StdToken", "STDT", 18, true, true, true, 1000000000);
		store = await DaoStorage.new([token.address], { from: creatorAddress });
	});

	describe("test getMemberByIndex()", () => {

		it("on existing group hash and index returns user address", async () => {
			await store.addGroupMember("ANY_GROUP", userAddress);
			let actualAddress = await store.getMemberByIndex("ANY_GROUP", 0);
			assert.equal(actualAddress, userAddress);
		});

		it("on invalid group name throws", async () => {
			await store.getMemberByIndex("INVALID_GROUP", 0).should.be.rejectedWith("revert");
		});

		it("on invalid index throws", async () => {
			await store.addGroupMember("ANY_GROUP", userAddress);
			await store.getMemberByIndex("ANY_GROUP", 1).should.be.rejectedWith("revert");
		});
	});

});
