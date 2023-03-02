import { task } from 'hardhat/config';
import { StakingTypes } from "../helpers/constants";
import { STAKED_TOKEN, REWARD_TOKEN } from "../helpers/deploy.config";

task("deploy-CooldownStaking", "Deploys the Cooldown Staking contract")
  .addFlag("verify", "Proceed with the Etherscan verification")
  .setAction(async (taskArgs, hre) => {
    console.log(`\n- ${StakingTypes.COOLDOWN_STAKING} deployment\n`);

    if (`${STAKED_TOKEN}` === hre.ethers.constants.AddressZero) {
      throw new Error(
        `Missing STAKED_TOKEN parameter`
      );
    }

    if (`${REWARD_TOKEN}` === hre.ethers.constants.AddressZero) {
      throw new Error(
        `Missing REWARD_TOKEN parameter`
      );
    }
    
    const CoreStaking = await hre.ethers.getContractFactory("CooldownStaking");
    const staking = await CoreStaking.deploy(STAKED_TOKEN, REWARD_TOKEN);

    await staking.deployed(); 

    if (taskArgs.verify) {
      await hre.run("verify:verify", {
        address: staking.address,
        constructorArguments: [
          STAKED_TOKEN,
          REWARD_TOKEN
        ],
      });
      console.log(`Cooldown Staking contract verified to ${staking.address}`);
    } else {
      console.log(`Cooldown Staking contract deployed to ${staking.address}`);
    }
  });