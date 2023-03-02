// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ICoreStaking {
    /// @notice Struct stakeholders info
    /// @param isStaked - true if stakeholder aready staked
    /// @param stakedAmount - number of tokens that stakeholder staked
    /// @param stakedTime - timestamp when stakeholder staked
    /// @param lastUpdatedRewardTime - timestamp when stakeholder last time unstaked
    /// @param unclaimedRewards - reward amount that stakeholder can withdraw
    struct Stakeholder {
        bool isStaked;
        uint256 stakedAmount;
        uint256 stakedTime;
        uint256 lastUpdatedRewardTime;
        uint256 unclaimedRewards;
    }

    /// @notice Struct staking pools info
    /// @param rewardInterval - period of time for rewards
    /// @param rewardsAmount - amount of tokens for the reward
    /// @param rewardsPerSecond - rewards amount that will be get stakeholder per second
    /// @param startTimeRewards - timestamp when reward interval is started
    /// @param finishTimeRewards - timestamp when reward interval is finished
    /// @param totalStakedAmount - amount of all staked tokens
    struct Pools {
        uint256 rewardInterval;
        uint256 rewardsAmount;
        uint256 rewardsPerSecond;
        uint256 startTimeRewards;
        uint256 finishTimeRewards;
        uint256 totalStakedAmount;
    }

    /// @notice This event is emitted when a reward is added.
    /// @param poolId - id of staking pool
    /// @param start - timestamp of the beginning of the rewards period
    /// @param  finish - timestamp of the ending of the rewards period
    /// @param rewardsAmount - the number of tokens that were added to the reward pool
    event AddedReward(
        uint256 indexed poolId,
        uint256 start,
        uint256 finish,
        uint256 rewardsAmount
    );

    /// @notice This event is emitted when a stakeholder stake amount of tokens.
    /// @param poolId - id of staking pool
    /// @param sender - address of the stakeholder
    /// @param amount - number of tokens to stake
    event Staked(
        uint256 indexed poolId,
        address indexed sender,
        uint256 amount
    );

    /// @notice This event is emitted when a stakeholder wants to withdraw amount of his staked tokens.
    /// @param poolId - id of staking pool
    /// @param recipient - address of the stakeholder
    /// @param amount - number of tokens to withdraw
    event Withdraw(
        uint256 indexed poolId,
        address indexed recipient,
        uint256 amount
    );

    /// @notice This event is emitted when a stakeholder wants to withdraw his rewards.
    /// @param poolId - id of staking pool
    /// @param recipient - address of the stakeholder
    /// @param rewardAmount - number of tokens of reward
    event ClaimedRewards(
        uint256 indexed poolId,
        address indexed recipient,
        uint256 rewardAmount
    );

    /// @notice Beneficiary or token address is zero.
    error ZeroAddress();

    /// @notice Zero amount of tokens.
    error ZeroAmount();

    /// @notice Pool id is incorrect (not exist = 0)
    error IncorrectPoolId();

    /// @notice Incorrect start time for reward interval
    /// @notice requestedTime - timestamp of requested time
    /// @notice currentTime - timestamp of current time
    error IncorrectStartTime(uint256 requestedTime, uint256 currentTime);

    /// @notice Incorrect reward interval
    /// @notice incorrectRewardsAmount - current rewards amount
    error IncorrectRewardInterval(
        uint256 incorrectRewardsAmount
    );

    /// @notice Incorrect reward amount
    error IncorrectRewardAmount();

    /// @notice Incorrect caller address (not the staker that is added in mapping)
    error OnlyStakerCanCall();

    /// @notice Incorrect time for staking in the pool (staking period is already finished)
    error IncorrectStakingTime();

    /// @notice setting rewards with parameters for stakers
    /// @dev only owner can set rewards
    /// @dev possible to set a few times
    /// @param start - timestamp when reward period should be started
    /// @param rewardInterval - period of time for rewards
    /// @param rewardsAmount - reward amount for that period
    function setRewards(
        uint256 start,
        uint256 rewardInterval,
        uint256 rewardsAmount
    ) external;

    /// @notice staking tokens amount
    /// @dev every one can stake tokens to the staking pool
    /// @param poolId - id of staking pool
    /// @param amount - tokens amount to stake
    function stake(uint256 poolId, uint256 amount) external;

    /// @notice claim rewards
    /// @param poolId - id of staking pool
    function claimRewards(uint256 poolId) external;
}
