import { task } from 'hardhat/config';
import { StakingTypes, MIN_STAKING_PERIOD, EARLY_FEE } from "../helpers/constants";
import { REWARD_TOKEN } from "../helpers/deploy.config";

task("deploy-Staking", "Deploys the Staking (with fee and apy) contract")
    .addFlag("verify", "Proceed with the Etherscan verification")
    .setAction(async (taskArgs, hre) => {
        console.log(`\n- ${StakingTypes.STAKING} deployment\n`);

        if (`${REWARD_TOKEN}` === hre.ethers.constants.AddressZero) {
            throw new Error(
                `Missing REWARD_TOKEN parameter`
            );
        }

        if (hre.ethers.BigNumber.from(`${MIN_STAKING_PERIOD}`) === hre.ethers.constants.Zero) {
            throw new Error(
                `Missing STAKING_PERIOD parameter`
            );
        }

        if (hre.ethers.BigNumber.from(`${MIN_STAKING_PERIOD}`) === hre.ethers.constants.Zero) {
            throw new Error(
                `Missing MIN_STAKING_PERIOD parameter`
            );
        }

        if (hre.ethers.BigNumber.from(`${EARLY_FEE}`) === hre.ethers.constants.Zero) {
            throw new Error(
                `Missing EARLY_FEE parameter`
            );
        }

        const Staking = await hre.ethers.getContractFactory("Staking");
        const staking = await Staking.deploy(REWARD_TOKEN, MIN_STAKING_PERIOD, EARLY_FEE);

        if (taskArgs.verify) {
            await hre.run("verify:verify", {
                address: staking.address,
                constructorArguments: [
                    REWARD_TOKEN,
                    MIN_STAKING_PERIOD,
                    EARLY_FEE
                ],
            });
        } else {
            console.log(`Staking contract deployed to ${staking.address}`);
        }
    });