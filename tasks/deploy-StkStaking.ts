import { task } from 'hardhat/config';
import { StakingTypes, REWARDS_PER_SECOND } from "../helpers/constants";
import { STAKED_TOKEN, STK_TOKEN } from "../helpers/deploy.config";

task("deploy-StkStaking", "Deploys the Stk Staking contract")
  .addFlag("verify", "Proceed with the Etherscan verification")
  .setAction(async (taskArgs, hre) => {
    console.log(`\n- ${StakingTypes.STK} deployment\n`);

    if (`${STAKED_TOKEN}` === hre.ethers.constants.AddressZero) {
      throw new Error(
        `Missing STAKED_TOKEN parameter`
      );
    }

    if (`${STK_TOKEN}` === hre.ethers.constants.AddressZero) {
      throw new Error(
        `Missing REWARD_TOKEN parameter`
      );
    }

    if (hre.ethers.BigNumber.from(`${REWARDS_PER_SECOND}`) === hre.ethers.constants.Zero) {
      throw new Error(
          `Missing STAKING_PERIOD parameter`
      );
  }
    
    const StkStaking = await hre.ethers.getContractFactory("StkStaking");
    const stkStaking = await StkStaking.deploy(STAKED_TOKEN, STK_TOKEN, REWARDS_PER_SECOND);

    await stkStaking.deployed(); 

    if (taskArgs.verify) {
      await hre.run("verify:verify", {
        address: stkStaking.address,
        constructorArguments: [
          STAKED_TOKEN, 
          STK_TOKEN, 
          REWARDS_PER_SECOND
        ],
      });
    } else {
      console.log(`STK Staking contract deployed to ${stkStaking.address}`);
    }
  });