// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../apr/APR.sol";
import "../../interfaces/core/ICoreStaking.sol";
import "../../interfaces/withdraw/IEmergencyWithdraw.sol";

contract CoreStaking is ICoreStaking, IEmergencyWithdraw, APR, Ownable {
    using SafeERC20 for IERC20;

    uint256 internal constant PRECISION = 100_000;
    uint256 internal constant DOUBLE_PRECISION = 10_000_000_000;
    /// @notice staked token address
    IERC20 public immutable STAKED_TOKEN;
    /// @notice reward token address
    IERC20 public immutable REWARD_TOKEN;
    /// @notice stores count of staking pools ids
    uint256 public stakingPoolsIds;
    /// @notice stakeholders info
    mapping(uint256 => mapping(address => Stakeholder)) public stakeholders;
    /// @notice store id to pools with diff rewards period
    mapping(uint256 => Pools) public stakingPools;

    /// @notice constructor
    /// @param _stakedToken - staked token address
    /// @param _rewardToken - reward token address
    constructor(address _stakedToken, address _rewardToken) {
        if (_stakedToken == address(0) || _rewardToken == address(0))
            revert ZeroAddress();

        STAKED_TOKEN = IERC20(_stakedToken);
        REWARD_TOKEN = IERC20(_rewardToken);
    }

    modifier updateRewards(uint256 poolId) {
        Stakeholder storage stakeholder = stakeholders[poolId][msg.sender];
        if(stakeholder.isStaked)
            stakeholder.unclaimedRewards += _calculateReward(
                    poolId,
                    stakeholder.stakedAmount,
                    stakeholder.stakedTime
                );
        _;
    }

    /// @notice setting rewards with parameters for stakers
    /// @dev only owner can set rewards
    /// @dev possible to set a few times
    /// @param startRewardsInterval - timestamp when reward period should be started
    /// @param rewardInterval - period of time for rewards
    /// @param rewardsAmount - reward amount for that period
    function setRewards(
        uint256 startRewardsInterval,
        uint256 rewardInterval,
        uint256 rewardsAmount
    ) external override onlyOwner {
        if (startRewardsInterval <= block.timestamp)
            revert IncorrectStartTime({
                requestedTime: startRewardsInterval,
                currentTime: block.timestamp
            });
        if (rewardInterval <= 0)
            revert IncorrectRewardInterval({
                incorrectRewardsAmount: rewardInterval
            });
        if (rewardsAmount <= 0) revert IncorrectRewardAmount();

        // stakingPoolsIds started from 1
        stakingPoolsIds++;

        uint256 finishTimeReward = startRewardsInterval + rewardInterval;

        stakingPools[stakingPoolsIds] = Pools({
            rewardInterval: rewardInterval,
            rewardsAmount: rewardsAmount,
            rewardsPerSecond: (rewardsAmount) / rewardInterval,
            startTimeRewards: startRewardsInterval,
            finishTimeRewards: finishTimeReward,
            totalStakedAmount: 0
        });

        REWARD_TOKEN.safeTransferFrom(msg.sender, address(this), rewardsAmount);

        emit AddedReward(
            stakingPoolsIds,
            startRewardsInterval,
            finishTimeReward,
            rewardsAmount
        );
    }

    /// @notice staking tokens amount
    /// @dev every one can stake tokens to the staking pool
    /// @param poolId - id of staking pool
    /// @param amount - tokens amount to stake
    function stake(uint256 poolId, uint256 amount) 
        public 
        virtual
        override 
        updateRewards(poolId) {
        if (poolId == 0 && stakingPools[poolId].startTimeRewards <= 0)
            revert IncorrectPoolId();
        if (amount == 0) revert ZeroAmount();
        if(block.timestamp >= stakingPools[poolId].finishTimeRewards) 
            revert IncorrectStakingTime();

        Stakeholder storage stakeholder = stakeholders[poolId][msg.sender];

        stakeholder.isStaked = true;
        stakeholder.stakedTime = block.timestamp;
        stakeholder.stakedAmount += amount;
        stakingPools[poolId].totalStakedAmount += amount;

        STAKED_TOKEN.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(poolId, msg.sender, amount);
    }

    /// @notice withdraw all (claimed reward and staked tokens)
    /// @param poolId - id of staking pool
    function exit(uint256 poolId) external override {
        withdraw(poolId, stakeholders[poolId][msg.sender].stakedAmount);
        claimRewards(poolId);
    }

    /// @notice claim rewards
    /// @dev only for stakers reward is calculated
    /// @param poolId - id of staking pool
    function claimRewards(uint256 poolId) public override {
        Stakeholder storage stakeholder = stakeholders[poolId][msg.sender];
        if (stakeholder.unclaimedRewards == 0) revert ZeroAmount();

        REWARD_TOKEN.safeTransfer(msg.sender, stakeholder.unclaimedRewards);

        emit ClaimedRewards(poolId, msg.sender, stakeholder.unclaimedRewards);

        stakeholder.unclaimedRewards = 0;
    }

    /// @notice withdrawing amount of staked tokens
    /// @dev only stakers can withdraw
    /// @param poolId - id of staking pool
    /// @param amount - tokens amount to withdraw staked tokens
    function withdraw(uint256 poolId, uint256 amount)
        public
        virtual
        override
        updateRewards(poolId)
    {
        if (poolId == 0 && stakingPools[poolId].startTimeRewards <= 0)
            revert IncorrectPoolId();
        if (amount == 0) revert ZeroAmount();
        if (!stakeholders[poolId][msg.sender].isStaked)
            revert OnlyStakerCanCall();

        Stakeholder storage stakeholder = stakeholders[poolId][msg.sender];

        stakeholder.stakedTime = block.timestamp;
        stakeholder.stakedAmount -= amount;
        stakingPools[poolId].totalStakedAmount -= amount;

        STAKED_TOKEN.safeTransfer(msg.sender, amount);

        emit Withdraw(poolId, msg.sender, amount);
    }

    function _calculateReward(
        uint256 poolId,
        uint256 stakedAmount,
        uint256 stakedTime
    ) internal view returns (uint256) {
        Pools memory pool = stakingPools[poolId];
        uint256 unstakedTime = block.timestamp;
        if (unstakedTime <= pool.startTimeRewards) {
            return 0;
        } else {
            stakedTime = stakedTime <= pool.startTimeRewards
                ? pool.startTimeRewards
                : stakedTime;
            unstakedTime = unstakedTime >= pool.finishTimeRewards
                ? pool.finishTimeRewards
                : unstakedTime;

            uint256 percentageInPool = stakedAmount * PRECISION /
                pool.totalStakedAmount;
            uint256 userRewardsPerSecond = percentageInPool *
                pool.rewardsPerSecond;
            return ((unstakedTime - stakedTime) * userRewardsPerSecond) / PRECISION;
        }
    }
}
