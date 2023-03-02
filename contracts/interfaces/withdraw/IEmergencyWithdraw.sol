// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IEmergencyWithdraw {
    /// @notice withdrawing amount of staked tokens
    /// @dev only stakers can withdraw
    /// @param poolId - id of staking pool
    /// @param amount - tokens amount to withdraw staked tokens
    function withdraw(uint256 poolId, uint256 amount) external;

    /// @notice withdraw all (claimed reward and staked tokens)
    /// @param poolId - id of staking pool
    function exit(uint256 poolId) external;
}
