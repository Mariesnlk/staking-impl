import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, constants, BigNumber } from 'ethers'
import { time, takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

describe("CooldownStaking", function () {

    const ONE_DAY: number = 24 * 60 * 60;

    const ether = ethers.utils.parseEther;

    let stakedToken: Contract
    let rewardToken: Contract
    let staking: Contract

    let owner: SignerWithAddress
    let user: SignerWithAddress
    let stakeholder1: SignerWithAddress
    let stakeholder2: SignerWithAddress
    let otherAccounts: SignerWithAddress[]

    let snapshot: SnapshotRestorer

    let startTime: number
    let finishTime: number
    let timestamp: any
    let rewardInterval: number = ONE_DAY * 30; // 30 days
    let cooldownPeriod: number = ONE_DAY * 10; // 10 days
    let rewardsAmount: string = "1000";
    let stakedAmount1: string = "170000";
    let stakedAmount2: string = "330000";
    let stakedTokenName: string = "STAKED TOKEN";
    let stakedTokenSymbol: string = "STAKEDT";
    let rewardTokenName: string = "REWARD TOKEN";
    let rewardTokenSymbol: string = "REWARDT";

    before(async () => {
        [owner, user, stakeholder1, stakeholder2, ...otherAccounts] = await ethers.getSigners();

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
        const ERC20Reward = await ethers.getContractFactory('ERC20Mock');
        const Staking = await ethers.getContractFactory('CooldownStaking');
        stakedToken = await ERC20Mock.deploy(stakedTokenName, stakedTokenSymbol);
        rewardToken = await ERC20Reward.deploy(rewardTokenName, rewardTokenSymbol);
        staking = await Staking.deploy(stakedToken.address, rewardToken.address);

        timestamp = await time.latest();
        startTime = timestamp + 2 * ONE_DAY; // 2 days

        await rewardToken.approve(staking.address, ether(rewardsAmount));
        await staking.setRewards(startTime, rewardInterval, ether(rewardsAmount));

        await stakedToken.approve(stakeholder1.address, ether(stakedAmount1));
        await stakedToken.transfer(stakeholder1.address, ether(stakedAmount1));

        await stakedToken.approve(stakeholder2.address, ether(stakedAmount2));
        await stakedToken.transfer(stakeholder2.address, ether(stakedAmount2));

        await stakedToken.connect(stakeholder2).approve(staking.address, ether(stakedAmount2));
        await staking.connect(stakeholder2).stake(1, ether(stakedAmount2));

        snapshot = await takeSnapshot();

    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("Deployment", function () {
        it("Should fail if staked token address is zero", async function () {
            const Staking = await ethers.getContractFactory('CooldownStaking');
            await expect(Staking.deploy(constants.AddressZero, rewardToken.address))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

        it("Should fail if reward token address is zero", async function () {
            const Staking = await ethers.getContractFactory('CooldownStaking');
            await expect(Staking.deploy(stakedToken.address, constants.AddressZero))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

    });

    describe("setCooldownPeriod", function () {
        it("Should revert if not the owner call the function", async function () {
            await expect(staking.connect(user).setCooldownPeriod(1, cooldownPeriod))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if pool id is invalid", async function () {
            await expect(staking.setCooldownPeriod(0, cooldownPeriod))
                .to.be.revertedWithCustomError(staking, "IncorrectPoolId");
        });

        it("Should revert if cooldown period is zero", async function () {
            await expect(staking.setCooldownPeriod(1, constants.Zero))
                .to.be.revertedWithCustomError(staking, "InvalidCooldownPeriod");
        });

        it("Should revert if cooldown period is more than 30 days", async function () {
            await expect(staking.setCooldownPeriod(1, ONE_DAY * 35))
                .to.be.revertedWithCustomError(staking, "InvalidCooldownPeriod");
        });

        it("Should set cooldown period correctly", async function () {
            const finishTime = startTime + rewardInterval;
            await expect(staking.setCooldownPeriod(1, cooldownPeriod))
                .to.emit(staking, "AddedCooldownPeriod")
                .withArgs(1, cooldownPeriod);
        });

        it("Should set cooldown period in two pools successfully", async function () {
            const finishTime = startTime + rewardInterval;
            await expect(staking.setCooldownPeriod(1, cooldownPeriod))
                .to.emit(staking, "AddedCooldownPeriod")
                .withArgs(1, cooldownPeriod);

            await rewardToken.approve(staking.address, ether(rewardsAmount));
            await staking.setRewards(startTime, rewardInterval, ether(rewardsAmount));

            await expect(staking.setCooldownPeriod(2, cooldownPeriod))
                .to.emit(staking, "AddedCooldownPeriod")
                .withArgs(2, cooldownPeriod);
        });

    });

    describe("withdraw", function () {
        it("Should revert if required amount is zero", async function () {
            await staking.setCooldownPeriod(1, cooldownPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(30 * ONE_DAY);

            await expect(staking.connect(stakeholder1).withdraw(1, 0))
               .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should decreased staked amount and activate cooldown period", async function () {
            await staking.setCooldownPeriod(1, cooldownPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(10 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether("100000"));

            const stakerCooldown = await staking.stakeholdersCooldowns(1, stakeholder1.address);
            expect(stakerCooldown.finishedCooldownPeriod).to.be.equal(await time.latest() + cooldownPeriod);
            expect(stakerCooldown.lockedAmount).to.be.equal(ether("100000"));
        });

        it("`Should withdraw 3 times in one cooldown period", async function () {
            const poolId = 1;
            const withdrawAmount = ether("100");

            await staking.setCooldownPeriod(poolId, cooldownPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(poolId, ether(stakedAmount1));

            await time.increase(5 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            await time.increase(5 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            await time.increase(5 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            await time.increase(5 * ONE_DAY);

            const cooldownInfo = await staking.stakeholdersCooldowns(poolId, stakeholder1.address);
            expect(await cooldownInfo.lockedPeriodCount).to.be.equal(3);
            expect(await cooldownInfo.lockedAmount).to.be.equal(ether("300"));
        });

        it("`Should withdraw 4 times in two cooldown period (3 times locked in one)", async function () {
            const poolId = 1;
            const withdrawAmount = ether("100");

            await staking.setCooldownPeriod(poolId, 4 * ONE_DAY);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(poolId, ether(stakedAmount1));

            await time.increase(2 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            await time.increase(2 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            await time.increase(2 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            let cooldownInfo = await staking.stakeholdersCooldowns(poolId, stakeholder1.address);
            expect(await cooldownInfo.lockedPeriodCount).to.be.equal(3);
            expect(await cooldownInfo.lockedAmount).to.be.equal(ether("300"));

            await time.increase(5 * ONE_DAY);
            await staking.connect(stakeholder1).withdraw(poolId, withdrawAmount);

            cooldownInfo = await staking.stakeholdersCooldowns(poolId, stakeholder1.address);
            expect(await cooldownInfo.lockedPeriodCount).to.be.equal(1);
            expect(await cooldownInfo.lockedAmount).to.be.equal(ether("100"));
            expect(await cooldownInfo.unlockAmount).to.be.equal(ether("300"));
        });

        it("Should decreased staked amount and reactivate cooldown period", async function () {
            await staking.setCooldownPeriod(1, cooldownPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(10 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether("50000"));

            let stakerCooldown = await staking.stakeholdersCooldowns(1, stakeholder1.address);
            expect(stakerCooldown.finishedCooldownPeriod).to.be.equal(await time.latest() + cooldownPeriod);
            expect(stakerCooldown.lockedAmount).to.be.equal(ether("50000"));

            await time.increase(5 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether("50000"));

            stakerCooldown = await staking.stakeholdersCooldowns(1, stakeholder1.address);
            expect(stakerCooldown.finishedCooldownPeriod).to.be.closeTo(await time.latest() + ((5 * ONE_DAY + cooldownPeriod) / 2), await time.latest() + ((5 * ONE_DAY + cooldownPeriod) / 2) + 5);
            expect(stakerCooldown.lockedAmount).to.be.equal(ether("100000"));
        });
    });

    describe("collectStakedTokens", function () {
        it("Should revert if cooldown period is not finished", async function () {
            await staking.setCooldownPeriod(1, cooldownPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(10 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether("100000"));

            await time.increase(5 * ONE_DAY);

            await expect(staking.connect(stakeholder1).collectStakedTokens(1))
               .to.be.revertedWithCustomError(staking, "EarlyWithdraw");
        });

        it("Should decreased staked amount and activate cooldown period", async function () {
            await staking.setCooldownPeriod(1, cooldownPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            expect(await stakedToken.balanceOf(stakeholder1.address)).to.be.equal(0);

            await time.increase(10 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether("100000"));

            await time.increase(10 * ONE_DAY);

            await expect(staking.connect(stakeholder1).collectStakedTokens(1))
                .to.emit(staking, "Withdraw")
                .withArgs(1, stakeholder1.address, ether("100000"));

            expect(await stakedToken.balanceOf(stakeholder1.address)).to.be.equal(ether("100000"));
        });
    });

});
