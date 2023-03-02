// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


/// @notice interface for Staking subcontract with the cooldown functionality
interface ICooldownStaking {

    /// @notice Struct staker info to withdraw with cooldown period
    /// @param lockedAmount - staked amount of tokens that are locked during the cooldown period
    /// @param unlockAmount - staked amount of tokens that are unlocked after the cooldown period is finished
    /// @param lockedPeriodCount - number of cooldown period that are started if there are any not finished
    /// @param startedCooldownPeriod - time in seconds when cooldown period is started
    /// @param finishedCooldownPeriod - time in seconds when cooldown period is finished
    struct StakeholderCooldownInfo {
        uint256 lockedAmount;
        uint256 unlockAmount;
        uint256 lockedPeriodCount;
        uint256 startedCooldownPeriod;
        uint256 finishedCooldownPeriod;
    }

    /// @notice emmited when cooldown period is added or updated
    /// @param poolId - id of staking pool
    /// @param cooldownInterval - time in seconds fow how long the cooldown period will be going
    event AddedCooldownPeriod(
        uint256 indexed poolId,
        uint256 cooldownInterval
    );

    /// @notice Cooldown period is more than 30 days
    error InvalidCooldownPeriod();

    /// @notice Staker wants to withdraw before cooldown period is finished
    /// @param expectedTime - time in seconds when the cooldown period is expected to finish
    /// @param currentTime - time in seconds the real time (less than expected) to withdraw tokens
    error EarlyWithdraw(uint256 expectedTime, uint256 currentTime);

    /// @notice setting cooldown period
    /// @param poolId - id of staking pool
    /// @param newCooldownPeriod - time in seconds of the new cooldown period
    function setCooldownPeriod(uint256 poolId, uint256 newCooldownPeriod) external;

    /// @notice coolect required amount after cooldown period is finished
    /// @param poolId - id of staking pool
    function collectStakedTokens(uint256 poolId) external;

}
