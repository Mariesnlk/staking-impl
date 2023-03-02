// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../core/CoreStaking.sol";
import "../../interfaces/sanctions/ISanctionsStaking.sol";

/// @notice Staking subcontract with the cooldown functionality
contract SanctionsStaking is CoreStaking, ISanctionsStaking {
    using SafeERC20 for IERC20;

    /// @notice poolId => sanctions fee
    mapping(uint256 => uint256) public sanctionsFeePercentage;
    /// @notice time in seconds before whick withdraw only possible with sanctions
    uint256 public sanctionsPeriod;
    /// @notice poolId => (staker_address => endedSanctionsPeriod)
    mapping(uint256 => mapping(address => uint256)) public endedSanctionsPeriod;

    /// @notice constructor
    /// @param _stakedToken - staked token address
    /// @param _rewardToken - reward token address
    constructor(address _stakedToken, address _rewardToken) CoreStaking(_stakedToken, _rewardToken) {}

    /// @notice setting sanctions fee for early withdraw
    /// @param _poolId - id of staking pool
    /// @param _sanctionsFee - percentage of sanctions fee
    /// @param _sanctionsPeriod - time in seconds that should be passed before user can withdraw staked tokens without sanctions
    function setSanctionsFee(uint256 _poolId, uint256 _sanctionsFee, uint256 _sanctionsPeriod) external override onlyOwner {
        if (_poolId == 0 && stakingPools[_poolId].startTimeRewards <= 0)
            revert IncorrectPoolId();
        if(_sanctionsFee <= 0 || _sanctionsFee >= PRECISION) revert InvalidSanctionsFee();
        if(_sanctionsPeriod <= 0) revert InvalidSanctionsPeriod(); 

        sanctionsFeePercentage[_poolId] = _sanctionsFee;

        emit AddedSanctions(_poolId, _sanctionsFee, _sanctionsPeriod);
    }

    /// @notice withdraw staked amounts before rewards period will be finished
    /// @param _poolId - id of staking pool
    /// @param _amount - amount of staked tokens to withdraw
    function withdraw(uint256 _poolId, uint256 _amount) 
        public 
        override {
        if(block.timestamp <= endedSanctionsPeriod[_poolId][msg.sender]) {
            Stakeholder storage stakeholder = stakeholders[_poolId][msg.sender];

            stakeholder.unclaimedRewards = (PRECISION - sanctionsFeePercentage[_poolId]) * _calculateReward(
                _poolId,
                stakeholder.stakedAmount,
                stakeholder.stakedTime
            ) / PRECISION;
            stakeholder.stakedTime = block.timestamp;
            stakingPools[_poolId].totalStakedAmount -= _amount;

            STAKED_TOKEN.safeTransfer(msg.sender, _amount);

            emit Withdraw(_poolId, msg.sender, _amount);
        } else {
            super.withdraw(_poolId, _amount);
        }
    }

    /// @notice staking tokens amount with possible sanctions withdraw
    /// @dev every one can stake tokens to the staking pool
    /// @param poolId - id of staking pool
    /// @param amount - tokens amount to stake
    function stake(uint256 poolId, uint256 amount) public override {
        super.stake(poolId, amount);

        endedSanctionsPeriod[poolId][msg.sender] = block.timestamp + sanctionsPeriod;
    }

}
