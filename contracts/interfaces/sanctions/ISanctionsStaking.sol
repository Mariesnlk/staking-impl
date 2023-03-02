// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/// @notice interface for Staking subcontract with sanctions functionality
interface ISanctionsStaking {
    /// @notice This event is emitted when a sacntions for staking is added.
    /// @param poolId - id of staking pool
    /// @param percentageFee - percentage of sanctions fee
    /// @param sanctionsPeriod - period in seconds for sanctions withdraw
    event AddedSanctions(
        uint256 indexed poolId,
        uint256 percentageFee,
        uint256 sanctionsPeriod
    );

    /// @notice Invalid Sacntions fee (less than 0 and more than 100)
    error InvalidSanctionsFee();

    /// @notice Invalid Sacntions period in seconds
    error InvalidSanctionsPeriod();

    /// @notice setting sanctions fee for early withdraw
    /// @param _poolId - id of staking pool
    /// @param _sanctionsFee - percentage of sanctions fee
    /// @param _sanctionsPeriod - time in seconds that should be passed before user can withdraw staked tokens without sanctions
    function setSanctionsFee(uint256 _poolId, uint256 _sanctionsFee, uint256 _sanctionsPeriod) external;

    /// @notice withdraw staked amounts before rewards period will be finished
    /// @param _poolId - id of staking pool
    /// @param _amount - amount of staked tokens to withdraw
    // function withdrawWithSanctions(uint256 _poolId, uint256 _amount) external;

}
