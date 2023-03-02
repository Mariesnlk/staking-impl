// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/// @notice StkStaking interface
interface IStkStaking {
    /// @notice emmited event when staker staked Staked tokens
    /// @param amountStakedToken - amount of the Staked tokens
    /// @param amountStkStakedTokens - amount of Stk tokens that the sender get back after staking
    /// @param staker - address of the sender
    event StakedStakedToken(
        uint256 amountStakedToken,
        uint256 amountStkStakedTokens,
        address indexed staker
    );

    /// @notice emmited event when staker staked Staked tokens
    /// @param amountStakedToken - amount of the Staked tokens the the reciever get back from stk tokens to withdraw
    /// @param amountStkStakedToken - amount of Stk tokens
    /// @param reciever - address of the reciever
    event StakedTokenWithdrawn(
        uint256 amountStakedToken,
        uint256 amountStkStakedToken,
        address indexed reciever
    );

    /// @notice emmited event when the reward per second is changed
    /// @param newAmount - the new amount of tokens as the rewards per second
    event AddedRewardsPerSecond(uint256 newAmount);

    /// @notice Beneficiary or token address is zero.
    error ZeroAddress();

    /// @notice Zero amount of tokens.
    error ZeroAmount();

    /// @notice Zero amount of rewards amount
    error ZeroRewardsAmount();

    /// @notice Invalid rewards interval (equal to 0)
    error InvalidRewardsInterval();

    /// @notice Incorrect amount of Stk tokens to withdraw
    /// @param available - amount of tokens in the user balance
    /// @param required - amount of tokens that is required
    error InvalidAmountToWithdraw(uint256 available, uint256 required);

    /// @notice Incorrect balance of Staked tokens 
    /// @param available - amount of tokens in the user balance
    /// @param required - amount of tokens that is required
    error InvalidBalanceOfStakedTokens(uint256 available, uint256 required);

    /// @notice Incorrect balance of Stk tokens 
    /// @param available - amount of tokens in the user balance
    /// @param required - amount of tokens that is required
    error InvalidBalanceOfStkTokens(uint256 available, uint256 required);

    /// @notice set rewards amount for rewards period
    /// @param _rewardsInterval - time in seconds for rewarding period
    /// @param _amountRewards - amount of tokens as a rewards that will be minted
    function setRewards(uint256 _rewardsInterval, uint256 _amountRewards) external;

    /// @notice staked `_amountStakedToken` for the spesific `_user`
    /// @param _user - address of the stakeholder
    /// @param _amountStakedToken - amount of Staked tokens 
    function stakeFor(address _user, uint256 _amountStakedToken) external;

    /// @notice staked `_amountStakedToken`
    /// @param _amountStakedToken - amount of Staked tokens 
    function stake(uint256 _amountStakedToken) external;

    /// @notice withdraw Staked tokens with rewards that is counted on the Stk tokens 
    /// @param _amountStkToWithdraw - amount of the Stk tokens that the staker wants to change fot Staked tokens for withdraw 
    function withdraw(uint256 _amountStkToWithdraw) external;

    /// @notice get rewards based on Staked tokens amount
    /// @param _amount - number of Staked tokens
    function getRewards(uint256 _amount) external view returns (uint256);

    /// @notice get amount of Staked tokens for the `_address` account
    /// @param _address - address of te stakeholder
    function getStakedToken(address _address) external view returns (uint256);
}
