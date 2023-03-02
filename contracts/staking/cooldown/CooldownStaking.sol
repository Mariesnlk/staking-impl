// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../core/CoreStaking.sol";
import "../../interfaces/cooldown/ICooldownStaking.sol";

/// @notice Staking subcontract with the cooldown functionality
contract CooldownStaking is CoreStaking, ICooldownStaking {
    using SafeERC20 for IERC20;

    /// @notice poolId => cooldownInterval
    mapping(uint256 => uint256) public cooldownIntervalsInPools;
    /// @notice poolId to mapping of staker address to staker's cooldown info
    mapping(uint256 => mapping(address => StakeholderCooldownInfo)) public stakeholdersCooldowns;

    /// @notice constructor
    /// @param _stakedToken - staked token address
    /// @param _rewardToken - reward token address
    constructor(address _stakedToken, address _rewardToken) 
        CoreStaking(_stakedToken, _rewardToken) {}

    /// @notice setting cooldown period
    /// @param poolId - id of staking pool
    /// @param newCooldownPeriod - time in seconds of the new cooldown period
    function setCooldownPeriod(uint256 poolId, uint256 newCooldownPeriod) 
        external 
        override 
        onlyOwner {
        if(newCooldownPeriod <= 0 || newCooldownPeriod > 30 days) revert InvalidCooldownPeriod();

        Pools memory pool = stakingPools[poolId];

        if (poolId <= 0 && pool.startTimeRewards <= 0)
            revert IncorrectPoolId();

        cooldownIntervalsInPools[poolId] = newCooldownPeriod;

        emit AddedCooldownPeriod(poolId, newCooldownPeriod);
    }

    /// @notice coolect required amount after cooldown period is finished
    /// @param poolId - id of staking pool
    function collectStakedTokens(uint256 poolId) 
        external 
        override {
        StakeholderCooldownInfo storage stakerCooldown = stakeholdersCooldowns[poolId][msg.sender];

        if(stakerCooldown.finishedCooldownPeriod >= block.timestamp) 
            revert EarlyWithdraw({expectedTime: stakerCooldown.finishedCooldownPeriod, currentTime: block.timestamp});

        stakerCooldown.unlockAmount += stakerCooldown.lockedAmount;
        STAKED_TOKEN.safeTransfer(msg.sender, stakerCooldown.unlockAmount);

        emit Withdraw(poolId, msg.sender, stakerCooldown.unlockAmount);
    }

    /// @notice request withdraw amount of staked tokens
    /// @param _poolId - id of staking pool
    /// @param _amount - tokens amount to withdraw staked tokens
    function withdraw(uint256 _poolId, uint256 _amount) 
        public
        override {
        if (_amount <= 0 ) revert ZeroAmount();

        _updateCooldown(_poolId, _amount);

        Stakeholder storage stakeholder = stakeholders[_poolId][msg.sender];

        stakeholder.unclaimedRewards += _calculateReward(
            _poolId,
            stakeholder.stakedAmount,
            stakeholder.stakedTime
        );
        stakeholder.stakedTime = block.timestamp;
        stakeholder.stakedAmount -= _amount;
        stakingPools[_poolId].totalStakedAmount -= _amount;
    }

    function _updateCooldown(uint256 _poolId, uint256 _amount) private {
        StakeholderCooldownInfo storage stakerCooldown = stakeholdersCooldowns[_poolId][msg.sender];

        // needed to count average time for cooldown periods
        if(stakerCooldown.finishedCooldownPeriod >= block.timestamp) {
            stakerCooldown.lockedPeriodCount++;
        } else {
            // previous cooldown period is finished
            stakerCooldown.lockedPeriodCount = 1;
            stakerCooldown.unlockAmount += stakerCooldown.lockedAmount;
            stakerCooldown.lockedAmount = 0;
        }

        stakerCooldown.startedCooldownPeriod = block.timestamp;
        stakerCooldown.finishedCooldownPeriod = stakerCooldown.lockedAmount == 0 
            ? stakerCooldown.startedCooldownPeriod + cooldownIntervalsInPools[_poolId]
            : stakerCooldown.startedCooldownPeriod + 
                (((stakerCooldown.finishedCooldownPeriod - stakerCooldown.startedCooldownPeriod) 
                + cooldownIntervalsInPools[_poolId]) / stakerCooldown.lockedPeriodCount);
        
        stakerCooldown.lockedAmount += _amount;

    }
}
