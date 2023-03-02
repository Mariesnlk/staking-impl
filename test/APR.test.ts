import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from 'ethers'

describe("APR", function () {

  const ether = ethers.utils.parseEther;

  let aprContract: Contract

  let owner: SignerWithAddress

  let distributionPerSecond: string = "0.000006";
  let stakedTotalSupply: string = "2000000";


  before(async () => {
    [owner] = await ethers.getSigners();

    const APR = await ethers.getContractFactory('APR');

    aprContract = await APR.deploy();

  });

  describe("getAPR", function () {
    it("Should calculate APY correctly", async function () {
      expect(await aprContract.getAPR(ether(distributionPerSecond), ether(stakedTotalSupply))).to.be.equal(946);
    });
  });

});
