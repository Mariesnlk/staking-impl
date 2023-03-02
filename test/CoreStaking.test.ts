import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, constants, BigNumber } from 'ethers'
import { time, takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

describe("CoreStaking", function () {

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
        const Staking = await ethers.getContractFactory('CoreStaking');
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
            const Staking = await ethers.getContractFactory('CoreStaking');
            await expect(Staking.deploy(constants.AddressZero, rewardToken.address))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

        it("Should fail if reward token address is zero", async function () {
            const Staking = await ethers.getContractFactory('CoreStaking');
            await expect(Staking.deploy(stakedToken.address, constants.AddressZero))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

    });

    describe("setRewards", function () {
        it("Should revert if not the owner call the function", async function () {
            await expect(staking.connect(user).setRewards(startTime, rewardInterval, ether(rewardsAmount)))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if start time is incorrect", async function () {
            startTime = 0;
            await expect(staking.setRewards(startTime, rewardInterval, ether(rewardsAmount)))
                .to.be.revertedWithCustomError(staking, "IncorrectStartTime");
        });

        it("Should revert if reward interval is incorrect", async function () {
            startTime = timestamp + ONE_DAY * 2; // 2 days
            await expect(staking.setRewards(startTime, 0, ether(rewardsAmount)))
                .to.be.revertedWithCustomError(staking, "IncorrectRewardInterval");
        });

        it("Should revert if reward amount is incorrect", async function () {
            await expect(staking.setRewards(startTime, rewardInterval, 0))
                .to.be.revertedWithCustomError(staking, "IncorrectRewardAmount");
        });

        it("Should set rewards correctly", async function () {
            finishTime = startTime + rewardInterval;
            await rewardToken.approve(staking.address, ether(rewardsAmount));
            await expect(staking.setRewards(startTime, rewardInterval, ether(rewardsAmount)))
                .to.emit(staking, "AddedReward")
                .withArgs(2, startTime, finishTime, ether(rewardsAmount));
            expect(await rewardToken.balanceOf(staking.address)).to.equal(ether("2000"));
        });

        it("Should set rewards in two pools successfully", async function () {
            finishTime = startTime + rewardInterval;
            await rewardToken.approve(staking.address, ether(rewardsAmount));
            await expect(staking.setRewards(startTime, rewardInterval, ether(rewardsAmount)))
                .to.emit(staking, "AddedReward")
                .withArgs(2, startTime, finishTime, ether(rewardsAmount));
            expect(await rewardToken.balanceOf(staking.address)).to.equal(ether("2000"));

            startTime = timestamp + 10 * ONE_DAY; // 10 days
            finishTime = startTime + rewardInterval;
            await rewardToken.approve(staking.address, ether(rewardsAmount));
            await expect(staking.setRewards(startTime, rewardInterval, ether(rewardsAmount)))
                .to.emit(staking, "AddedReward")
                .withArgs(3, startTime, finishTime, ether(rewardsAmount));
            expect(await rewardToken.balanceOf(staking.address)).to.equal(ether("3000"));
        });

    });

    describe("stake", function () {
        it("Should correctly check rewards pool balance", async function () {
            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether(stakedAmount2));
            expect(await rewardToken.balanceOf(staking.address)).to.be.equal(ether(rewardsAmount));
        });

        it("Should revert if pool id is invalid", async function () {
            await expect(staking.connect(stakeholder1).stake(0, ether(stakedAmount1)))
                .to.be.revertedWithCustomError(staking, "IncorrectPoolId");
        });

        it("Should revert if staked amount is invalid", async function () {
            await expect(staking.connect(stakeholder1).stake(1, 0))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should staked the first time", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));
            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether("500000"));
        });

        it("Should staked if was already staked before", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));
            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether("500000"));

            let stakeholder = await staking.stakeholders(1, stakeholder1.address);
            expect(stakeholder.unclaimedRewards).to.be.equal(0);

            await time.increase(20 * ONE_DAY);

            await stakedToken.approve(stakeholder1.address, ether(stakedAmount1));
            await stakedToken.transfer(stakeholder1.address, ether(stakedAmount1));

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether("670000"));

            stakeholder = await staking.stakeholders(1, stakeholder1.address);
            expect(stakeholder.unclaimedRewards).to.be.equal(BigNumber.from("204001836419752838353"));
        });

        it("Should staked with emitted event", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await expect(staking.connect(stakeholder1).stake(1, ether(stakedAmount1)))
                .to.emit(staking, "Staked")
                .withArgs(1, stakeholder1.address, ether(stakedAmount1));
            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether("500000"));
        });

        it("Should staked in two different pools at the same time", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));
            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether("500000"));

            await rewardToken.approve(staking.address, ether(rewardsAmount));
            await staking.setRewards(startTime, rewardInterval, ether(rewardsAmount));

            await stakedToken.approve(stakeholder1.address, ether(stakedAmount1));
            await stakedToken.transfer(stakeholder1.address, ether(stakedAmount1));

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(2, ether(stakedAmount1));

            expect(await stakedToken.balanceOf(staking.address)).to.be.equal(ether("670000"));
        });

        it("Should revert if user try to stake when rewards time is finished", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));

            await time.increase(35 * ONE_DAY);

            await expect(staking.connect(stakeholder1).stake(1, stakedAmount1))
                .to.be.revertedWithCustomError(staking, "IncorrectStakingTime");
        });
    });

    describe("claimRewards", function () {
        it("Should revert if reward is zero", async function () {
            await expect(staking.connect(user).claimRewards(1))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should claimRewards correctly", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(10 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether(stakedAmount1));

            await expect(staking.connect(stakeholder1).claimRewards(1))
                .to.emit(staking, "ClaimedRewards");
        });

        it("Should revert if rewards are already claimed", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(10 * ONE_DAY);

            await staking.connect(stakeholder1).withdraw(1, ether(stakedAmount1));
            await staking.connect(stakeholder1).claimRewards(1);

            await expect(staking.connect(user).claimRewards(1))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });
    });

    describe("withdraw", function () {
        it("Should revert if try to withdraw not stakeholder", async function () {
            await expect(staking.connect(user).withdraw(1, ether("10")))
                .to.be.revertedWithCustomError(staking, "OnlyStakerCanCall");
        });

        it("Should revert if pool id is not exists", async function () {
            await expect(staking.connect(user).withdraw(0, ether("10")))
                .to.be.revertedWithCustomError(staking, "IncorrectPoolId");
        });

        it("Should revert if user wants to withdraw zero amount", async function () {
            await expect(staking.connect(user).withdraw(1, ether("0")))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should withdraw correctly", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(30 * ONE_DAY);

            await expect(staking.connect(stakeholder1).withdraw(1, ether("100000")))
                .to.emit(staking, "Withdraw")
                .withArgs(1, stakeholder1.address, ether("100000"));

            const stakeholder = await staking.stakeholders(1, stakeholder1.address);
            expect(stakeholder.stakedAmount).to.be.equal(ether("70000"));
            expect(stakeholder.unclaimedRewards).to.be.closeTo(BigNumber.from("317334776234567901229"), BigNumber.from("319000000000000000000"));
        });

        it("Should withdraw all staked amount",
            async function () {
                await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
                await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

                await time.increase(30 * ONE_DAY);

                await expect(staking.connect(stakeholder1).withdraw(1, stakedAmount1))
                    .to.emit(staking, "Withdraw")
                    .withArgs(1, stakeholder1.address, stakedAmount1);

                const user1 = await staking.stakeholders(1, stakeholder1.address);
                expect(user1.unclaimedRewards).to.be.closeTo(BigNumber.from("317334907407407407402"), BigNumber.from("319000000000000000000"));

                await expect(staking.connect(stakeholder2).withdraw(1, stakedAmount2))
                    .to.emit(staking, "Withdraw")
                    .withArgs(1, stakeholder2.address, stakedAmount2);

                const user2 = await staking.stakeholders(1, stakeholder2.address);
                expect(user2.unclaimedRewards).to.be.closeTo(BigNumber.from("616003310185185185175"), BigNumber.from("619000000000000000000"));
            });
    });

    describe("exit", function () {
        it("Should exit correctly", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(30 * ONE_DAY);

            await staking.connect(stakeholder1).exit(1);

            expect(await rewardToken.balanceOf(stakeholder1.address)).to.be.closeTo(BigNumber.from("317334907407407407402"), BigNumber.from("319000000000000000000"));
        });
    });

});
