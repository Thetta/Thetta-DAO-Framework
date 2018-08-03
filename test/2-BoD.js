const CheckExceptions = require("./utils/checkexceptions");
const should = require("./utils/helpers");

const BodDaoFactory = artifacts.require("BodDaoFactory");
const DaoBaseAuto = artifacts.require("DaoBaseAuto");
const DaoBaseWithUnpackers = artifacts.require("DaoBaseWithUnpackers");
const DaoStorage = artifacts.require("DaoStorage");
const GenericProposal = artifacts.require("GenericProposal");
const InformalProposal = artifacts.require("InformalProposal");
const Voting = artifacts.require("Voting");
const WeiTask = artifacts.require("WeiTask");

contract("BodDaoFactory", (accounts) => {

	const creator = accounts[0];
	const director1 = accounts[1];
	const director2 = accounts[2];
	const director3 = accounts[3];
	const employee1 = accounts[4];
	const employee2 = accounts[5];

	var bodDaoFactory;
	let store;
	let daoBase;
	let aac;
	let informalProposal;
	let weiTask;
	let voting;

	beforeEach(async () => {

	});

	it("BoD should deploy", async () => {
		bodDaoFactory = await BodDaoFactory.new(creator, [director1, director2, director3], [employee1, employee2], {gasPrice:0, gas:1e13});
		const daoBaseAddress = await bodDaoFactory.daoBase();
		daoBase = DaoBaseWithUnpackers.at(daoBaseAddress);

		const storeAddress = await bodDaoFactory.store();
		store = DaoStorage.at(storeAddress);
	});
});
