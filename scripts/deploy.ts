import { ethers } from "hardhat";

async function main() {

  const StakedToken = await ethers.getContractFactory("ERC20Mock");
  const stakedToken = await StakedToken.deploy("Staked Token", "ST");

  console.log("Staked Token contract: ", stakedToken.address);

  const RewardsToken = await ethers.getContractFactory("ERC20Mock");
  const rewardsToken = await RewardsToken.deploy("Rewards Token", "RT");

  console.log("Rewards Token contract: ", rewardsToken.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
