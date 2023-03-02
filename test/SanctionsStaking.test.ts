import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, constants, BigNumber } from 'ethers'
import { time, takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

describe("SanctionsStaking", function () {

    const ONE_DAY: number = 24 * 60 * 60;

    const ether = ethers.utils.parseEther;

    let stakedToken: Contract
    let rewardToken: Contract
    let staking: Contract

    let owner: SignerWithAddress
    let user: SignerWithAddress
    let stakeholder1: SignerWithAddress
    let stakeholder2: SignerWithAddress
    let stakeholder3: SignerWithAddress
    let stakeholder4: SignerWithAddress
    let otherAccounts: SignerWithAddress[]

    let snapshot: SnapshotRestorer

    let startTime: number
    let timestamp: any
    let rewardInterval: number = ONE_DAY * 30; // 30 days
    let poolId: number = 1;
    let sanctionsFee: number = 20000; // 20%
    let sanctionsPeriod: number = ONE_DAY * 5; // 5 days
    let rewardsAmount: string = "1000";
    let stakedAmount1: string = "170000";
    let stakedAmount2: string = "330000";
    let stakedTokenName: string = "STAKED TOKEN";
    let stakedTokenSymbol: string = "STAKEDT";
    let rewardTokenName: string = "REWARD TOKEN";
    let rewardTokenSymbol: string = "REWARDT";

    let stakedAmount1Test: string = "900";
    let stakedAmount2Test: string = "100";
    let rewardsAmountTest: string = "10000";

    before(async () => {
        [owner, user, stakeholder1, stakeholder2, stakeholder3, stakeholder4, ...otherAccounts] = await ethers.getSigners();

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
        const ERC20Reward = await ethers.getContractFactory('ERC20Mock');
        const Staking = await ethers.getContractFactory('SanctionsStaking');
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
            const Staking = await ethers.getContractFactory('SanctionsStaking');
            await expect(Staking.deploy(constants.AddressZero, rewardToken.address))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

        it("Should fail if reward token address is zero", async function () {
            const Staking = await ethers.getContractFactory('SanctionsStaking');
            await expect(Staking.deploy(stakedToken.address, constants.AddressZero))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

    });

    describe("setSanctionsFee", function () {
        it("Should revert if not the owner call the function", async function () {
            await expect(staking.connect(user).setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if pool id is zero", async function () {
            await expect(staking.setSanctionsFee(constants.Zero, sanctionsFee, sanctionsPeriod))
                .to.be.revertedWithCustomError(staking, "IncorrectPoolId");
        });

        it("Should revert if sanction fee is 0%", async function () {
            await expect(staking.setSanctionsFee(poolId, constants.Zero, sanctionsPeriod))
                .to.be.revertedWithCustomError(staking, "InvalidSanctionsFee");
        });

        it("Should revert if sanction fee is 100%", async function () {
            await expect(staking.setSanctionsFee(poolId, 100000, sanctionsPeriod))
                .to.be.revertedWithCustomError(staking, "InvalidSanctionsFee");
        });

        it("Should revert if sanction fee is 100%", async function () {
            await expect(staking.setSanctionsFee(poolId, sanctionsFee, constants.Zero))
                .to.be.revertedWithCustomError(staking, "InvalidSanctionsPeriod");
        });

        it("Should set sanctions fee correctly", async function () {
            await expect(staking.setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod))
                .to.emit(staking, "AddedSanctions")
                .withArgs(poolId, sanctionsFee, sanctionsPeriod);
            expect(await staking.sanctionsFeePercentage(poolId)).to.equal(sanctionsFee);
        });
    });

    describe("stake", function () {
        it("Should stake with sanctions period", async function () {
            await staking.setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod);

            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            const expectedTime = await time.latest() + sanctionsPeriod;
            expect(await staking.endedSanctionsPeriod(1, stakeholder1.address)).to.be.not.equal(0);
        });
    });

    describe("withdraw", function () {
        it("Should withdraw with sanction fee", async function () {
            await staking.setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod);
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(3 * ONE_DAY); // sanctions in first 5 days of staking

            await expect(staking.connect(stakeholder1).withdraw(1, ether("100000")))
                .to.emit(staking, "Withdraw")
                .withArgs(1, stakeholder1.address, ether("100000"));

            const stakeholder = await staking.stakeholders(1, stakeholder1.address);
            console.log(await stakeholder.unclaimedRewards);
            expect(stakeholder.unclaimedRewards).to.be.not.equal(0);
        });

        it("Should withdraw without sanctions", async function () {
            await staking.setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod);
            await stakedToken.connect(stakeholder1).approve(staking.address, ether(stakedAmount1));
            await staking.connect(stakeholder1).stake(1, ether(stakedAmount1));

            await time.increase(40 * ONE_DAY);

            await expect(staking.connect(stakeholder1).withdraw(1, stakedAmount1))
                .to.emit(staking, "Withdraw")
                .withArgs(1, stakeholder1.address, stakedAmount1);

            const stakeholder = await staking.stakeholders(1, stakeholder1.address);
            console.log(await stakeholder.unclaimedRewards);
            expect(stakeholder.unclaimedRewards).to.be.not.equal(0);
        });
    });

    describe("check calculate rewards", function () {
        it("check rewards calculation during second stake", async function () {
            poolId = 2;
            await rewardToken.approve(staking.address, ether(rewardsAmountTest));
            await staking.setRewards(startTime, rewardInterval, ether(rewardsAmountTest));

            await stakedToken.approve(stakeholder3.address, ether(stakedAmount1Test));
            await stakedToken.transfer(stakeholder3.address, ether(stakedAmount1Test));

            await stakedToken.approve(stakeholder4.address, ether(stakedAmount2Test));
            await stakedToken.transfer(stakeholder4.address, ether(stakedAmount2Test));

            await staking.setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod);

            await stakedToken.connect(stakeholder3).approve(staking.address, ether(stakedAmount1Test));
            await staking.connect(stakeholder3).stake(poolId, ether(stakedAmount1Test));

            await stakedToken.connect(stakeholder4).approve(staking.address, ether(stakedAmount2Test));
            await staking.connect(stakeholder4).stake(poolId, ether(stakedAmount2Test));

            await time.increase(5 * ONE_DAY);

            await stakedToken.approve(stakeholder4.address, ether(stakedAmount2Test));
            await stakedToken.transfer(stakeholder4.address, ether(stakedAmount2Test));

            await stakedToken.connect(stakeholder4).approve(staking.address, ether(stakedAmount2Test));
            await staking.connect(stakeholder4).stake(poolId, ether(stakedAmount2Test));

            const stakeholder = await staking.stakeholders(poolId, stakeholder4.address);
            console.log(await stakeholder.unclaimedRewards);
        });

        it("check rewards calculation during withdraw", async function () {
            poolId = 2;
            await rewardToken.approve(staking.address, ether(rewardsAmountTest));
            await staking.setRewards(startTime, rewardInterval, ether(rewardsAmountTest));

            await stakedToken.approve(stakeholder3.address, ether(stakedAmount1Test));
            await stakedToken.transfer(stakeholder3.address, ether(stakedAmount1Test));

            await stakedToken.approve(stakeholder4.address, ether(stakedAmount2Test));
            await stakedToken.transfer(stakeholder4.address, ether(stakedAmount2Test));

            await staking.setSanctionsFee(poolId, sanctionsFee, sanctionsPeriod);

            await stakedToken.connect(stakeholder3).approve(staking.address, ether(stakedAmount1Test));
            await staking.connect(stakeholder3).stake(poolId, ether(stakedAmount1Test));

            await stakedToken.connect(stakeholder4).approve(staking.address, ether(stakedAmount2Test));
            await staking.connect(stakeholder4).stake(poolId, ether(stakedAmount2Test));

            await time.increase(40 * ONE_DAY);

            await staking.connect(stakeholder4).withdraw(poolId, stakedAmount2Test);

            const stakeholder = await staking.stakeholders(poolId, stakeholder4.address);
            console.log(await stakeholder.unclaimedRewards);
        });
    });

});