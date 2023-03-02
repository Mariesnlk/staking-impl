import { ethers } from "hardhat";
const hre = require("hardhat");

async function main() {

  const StakedToken = await ethers.getContractFactory("StakedToken");
  const stakedToken = await StakedToken.deploy("Staked Token", "ST");

  console.log("Staked Token contract: ", stakedToken.address);

  const StkToken = await ethers.getContractFactory("StkToken");
  const stkToken = await StkToken.deploy("Stk Token", "STK");

  console.log("STK Token contract: ", stkToken.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
