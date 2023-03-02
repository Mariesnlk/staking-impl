import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, constants, BigNumber } from 'ethers'
import { time, takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

describe("StkStaking", function () {

    const ONE_DAY: number = 24 * 60 * 60;

    const ether = ethers.utils.parseEther;

    let stakedToken: Contract
    let stkToken: Contract
    let staking: Contract

    let owner: SignerWithAddress
    let user: SignerWithAddress
    let stakeholder1: SignerWithAddress
    let stakeholder2: SignerWithAddress
    let otherAccounts: SignerWithAddress[]

    let snapshot: SnapshotRestorer

    let stakedTokenName: string = "STAKED TOKEN";
    let stakedTokenSymbol: string = "ST";
    let stkTokenName: string = "STK TOKEN";
    let stkTokenSymbol: string = "STK";

    let stakedAmount: any = ether("500");
    let rewardsInterval: number = ONE_DAY * 40;
    let rewardsAmount: any = ether("1000");

    before(async () => {
        [owner, user, stakeholder1, stakeholder2, ...otherAccounts] = await ethers.getSigners();

        const StakedToken = await ethers.getContractFactory('StakedToken');
        const Staking = await ethers.getContractFactory('StkStakingMock');
        stakedToken = await StakedToken.deploy(stakedTokenName, stakedTokenSymbol);
        staking = await Staking.deploy(stakedToken.address, stkTokenName, stkTokenSymbol);

        await stakedToken.approve(stakeholder1.address, ether("1000"));
        await stakedToken.transfer(stakeholder1.address, ether("1000"));

        await stakedToken.approve(stakeholder2.address, ether("1000"));
        await stakedToken.transfer(stakeholder2.address, ether("1000"));

        await staking.setRewards(rewardsInterval, rewardsAmount);

        snapshot = await takeSnapshot();

    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("Deployment", function () {
        it("Should fail if staked token address is zero", async function () {
            const Staking = await ethers.getContractFactory('StkStaking');
            await expect(Staking.deploy(constants.AddressZero, stkTokenName, stkTokenSymbol))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });
    });

    describe("setRewards", function () {
        it("Should fail if not owner sets rewards", async function () {
            await expect(staking.connect(stakeholder1).setRewards(rewardsInterval, rewardsAmount))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should fail if rewards interval is zero", async function () {
            await expect(staking.setRewards(constants.Zero, rewardsAmount))
                .to.be.revertedWithCustomError(staking, "InvalidRewardsInterval");
        });

        it("Should fail if rewards amount is zero", async function () {
            await expect(staking.setRewards(rewardsInterval, constants.Zero))
                .to.be.revertedWithCustomError(staking, "ZeroRewardsAmount");
        });

        it("Should setRewards with emitted event", async function () {
            await expect(staking.setRewards(rewardsInterval, rewardsAmount))
                .to.emit(staking, "AddedRewardsPerSecond")
                .withArgs(289351851851851);
        });
    });

    describe("getters", function () {
        it("Should getStakedToken back after staking correctly", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await staking.connect(stakeholder1).stake(stakedAmount);

            await stakedToken.connect(stakeholder2).approve(staking.address, ether("300"));
            await staking.connect(stakeholder2).stake(ether("300"));

            await time.increase(20 * ONE_DAY);

            console.log(await staking.getStakedToken(stakeholder1.address));
        });

        it("Should get getStakingReward correctly", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await staking.connect(stakeholder1).stake(stakedAmount);

            await stakedToken.connect(stakeholder2).approve(staking.address, ether("300"));
            await staking.connect(stakeholder2).stake(ether("300"));

            await time.increase(20 * ONE_DAY);

            console.log(await staking.getRewards(stakeholder1.address));
        });
    });

    describe("stake", function () {
        it("Should fail if staked tokens amount is zero", async function () {
            await expect(staking.connect(stakeholder1).stake(ether("0")))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should stake for the first time in pool", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await staking.connect(stakeholder1).stake(stakedAmount);
            expect(await staking.balanceOf(stakeholder1.address)).to.be.equal(await staking.convertToStkTokens(stakedAmount));
        });

        it("Should stake into the pool in two different accounts", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await staking.connect(stakeholder1).stake(stakedAmount);
            expect(await staking.balanceOf(stakeholder1.address)).to.be.equal(await staking.convertToStkTokens(stakedAmount));

            await time.increase(10 * ONE_DAY);

            await stakedToken.connect(stakeholder2).approve(staking.address, ether("300"));
            await staking.connect(stakeholder2).stake(ether("300"));
            expect(await staking.balanceOf(stakeholder2.address)).to.be.equal(await staking.convertToStkTokens(ether("300")));
        });

        it("Should stake with emitted event", async function () {
            const amountStkStakedTokens = await staking.convertToStkTokens(stakedAmount);
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await expect(staking.connect(stakeholder1).stake(stakedAmount))
                .to.emit(staking, "StakedStakedToken")
                .withArgs(stakedAmount, amountStkStakedTokens, stakeholder1.address);
        });
    });

    describe("stakeFor", function () {
        it("Should fail if staked tokens amount is zero", async function () {
            await expect(staking.stakeFor(stakeholder1.address, ether("0")))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should fail if stakeholder address is zero address", async function () {
            await expect(staking.stakeFor(constants.AddressZero, stakedAmount))
                .to.be.revertedWithCustomError(staking, "ZeroAddress");
        });

        it("Should stakeFor with emitted event", async function () {
            const amountStkStakedTokens = await staking.convertToStkTokens(stakedAmount);
            console.log(amountStkStakedTokens)
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await expect(staking.connect(stakeholder1).stakeFor(stakeholder1.address, stakedAmount))
                .to.emit(staking, "StakedStakedToken")
                .withArgs(stakedAmount, amountStkStakedTokens, stakeholder1.address);
        });
    });

    describe("withdraw", function () {
        it("Should fail withdraw if stk tokens amount is zero", async function () {
            await expect(staking.withdraw(ether("0")))
                .to.be.revertedWithCustomError(staking, "ZeroAmount");
        });

        it("Should fail withdraw if stk tokens amount is less than staked", async function () {
            await expect(staking.withdraw(ether("100")))
                .to.be.revertedWithCustomError(staking, "InvalidAmountToWithdraw");
        });

        it("Should fail withdraw", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await staking.connect(stakeholder1).stake(stakedAmount);

            await time.increase(30 * ONE_DAY);

            await expect(staking.connect(stakeholder1).withdraw(ether("400")))
                .to.be.revertedWithCustomError(staking, "InvalidBalanceOfStakedTokens");
        });

        it("Should withdraw with emitted event", async function () {
            await stakedToken.connect(stakeholder1).approve(staking.address, stakedAmount);
            await staking.connect(stakeholder1).stake(stakedAmount);

            await stakedToken.connect(stakeholder2).approve(staking.address, ether("300"));
            await staking.connect(stakeholder2).stake(ether("300"));

            await time.increase(30 * ONE_DAY);

            await expect(staking.connect(stakeholder1).withdraw(ether("50")))
                .to.emit(staking, "StakedTokenWithdrawn");

            console.log(await staking.convertToStakedTokens(ether("50")));
        });
    });

});