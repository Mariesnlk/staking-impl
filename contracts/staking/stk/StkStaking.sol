// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../interfaces/stk/IStkToken.sol";
import "../../interfaces/stk/IStkStaking.sol";

contract StkStaking is IStkStaking, ERC20, Ownable {
    using SafeERC20 for IERC20;

    /// @notice staked token address
    IERC20 public immutable STAKED_TOKEN;
    /// @notice total amount of staked tokens
    uint256 public totalPool;
    /// @notice amount of rewards for stakeholder that can be collected per second
    uint256 public rewardsPerSecond;
    /// @notice timestamp in seconds when the reward pool was the last time updated
    uint256 public lastUpdatedTimestamp;

    /// @notice constructor
    /// @param _stakedToken - staked token address
    /// @param _stkName - stk token name
    /// @param _stkSymbol - stk token symbol
    constructor(
        address _stakedToken,
        string memory _stkName,
        string memory _stkSymbol
    ) ERC20(_stkName, _stkSymbol) {
        if (_stakedToken == address(0)) revert ZeroAddress();

        STAKED_TOKEN = IERC20(_stakedToken);
        lastUpdatedTimestamp = block.timestamp;
    }

    modifier updateRewardPool() {
        if (totalPool > 0) {
            totalPool = totalPool + _calculateReward();
        }

        lastUpdatedTimestamp = block.timestamp;
        _;
    }

    /// @notice set rewards amount for rewards period
    /// @param _rewardsInterval - time in seconds for rewarding period
    /// @param _amountRewards - amount of tokens as a rewards that will be minted
    function setRewards(uint256 _rewardsInterval, uint256 _amountRewards)
        external
        updateRewardPool
        onlyOwner
    {
        if (_rewardsInterval <= 0) revert InvalidRewardsInterval();
        if (_amountRewards <= 0) revert ZeroRewardsAmount();

        rewardsPerSecond = _amountRewards / _rewardsInterval;

        emit AddedRewardsPerSecond(rewardsPerSecond);
    }

    /// @notice staked `_amountStakedTokens` for the spesific `_user`
    /// @param _user - address of the stakeholder
    /// @param _amountStakedTokens - amount of Staked tokens 
    function stakeFor(address _user, uint256 _amountStakedTokens)
        external
        override
    {
        if(_user == address(0)) revert ZeroAddress();
        if (_amountStakedTokens == 0) revert ZeroAmount();

        _stake(_user, _amountStakedTokens);
    }

    /// @notice staked `_amountStakedTokens`
    /// @param _amountStakedTokens - amount of Staked tokens 
    function stake(uint256 _amountStakedTokens) external override {
        if (_amountStakedTokens == 0) revert ZeroAmount();

        _stake(msg.sender, _amountStakedTokens);
    }

    /// @notice withdraw Staked tokens with rewards that is counted on the Stk tokens 
    /// @param _amountStkToWithdraw - amount of the Stk tokens that the staker wants to change fot Staked tokens for withdraw 
    function withdraw(uint256 _amountStkToWithdraw)
        external
        override
        updateRewardPool
    {
        if (_amountStkToWithdraw == 0) revert ZeroAmount();

        uint256 availableStkTokens = balanceOf(msg.sender);
        if (availableStkTokens < _amountStkToWithdraw)
            revert InvalidAmountToWithdraw({
                available: availableStkTokens,
                required: _amountStkToWithdraw
            });

        uint256 amountStakedTokens = _convertToStakedToken(_amountStkToWithdraw);
        uint256 availbaleStakedTokens = STAKED_TOKEN.balanceOf(address(this));

        if (availbaleStakedTokens < amountStakedTokens)
            revert InvalidBalanceOfStakedTokens({
                available: availbaleStakedTokens,
                required: amountStakedTokens
            });

        _burn(msg.sender, _amountStkToWithdraw);

        totalPool = totalPool - amountStakedTokens;

        STAKED_TOKEN.safeTransfer(msg.sender, amountStakedTokens);

        emit StakedTokenWithdrawn(
            amountStakedTokens,
            _amountStkToWithdraw,
            msg.sender
        );
    }

    /// @notice get rewards based on Staked tokens amount
    /// @param _amount - number of Staked tokens
    function getRewards(uint256 _amount)
        external
        view
        override
        returns (uint256)
    {
        return _convertToStakedToken(_amount);
    }

    /// @notice get amount of Staked tokens for the `_address` account
    /// @param _address - address of te stakeholder
    function getStakedToken(address _address)
        external
        view
        override
        returns (uint256)
    {
        uint256 balance = balanceOf(_address);
        return balance > 0 ? _convertToStakedToken(balance) : 0;
    }

    /// @notice staked `_amountStakedTokens` for the spesific `_staker`
    /// @dev internal function for stake
    /// @param _staker - address of the stakeholder
    /// @param _amountStakedTokens - amount of Staked tokens 
    function _stake(address _staker, uint256 _amountStakedTokens)
        internal
        updateRewardPool
    {
        STAKED_TOKEN.safeTransferFrom(
            _staker,
            address(this),
            _amountStakedTokens
        );

        uint256 amountInStkTokens = _convertToStkToken(
            _amountStakedTokens
        );
        
        _mint(_staker, amountInStkTokens);

        totalPool += _amountStakedTokens;

        emit StakedStakedToken(
            _amountStakedTokens,
            amountInStkTokens,
            _staker
        );
    }

    function _convertToStkToken(uint256 _amount)
        internal
        view
        returns (uint256)
    {
        uint256 stkTokenTotalSupply = totalSupply();
        uint256 stakingPool = totalPool + _calculateReward();

        if (stakingPool > 0 && stkTokenTotalSupply > 0) {
            _amount = stkTokenTotalSupply * _amount / stakingPool;
        }

        return _amount;
    }

    function _convertToStakedToken(uint256 _amount)
        internal
        view
        returns (uint256)
    {
        uint256 stkTokenTotalSupply = totalSupply();
        uint256 stakingPool = totalPool + _calculateReward();

        return
            stkTokenTotalSupply > 0
                ? stakingPool * _amount / stkTokenTotalSupply
                : 0;
    }

    function _calculateReward() internal view returns (uint256) {
        uint256 timePassed = block.timestamp - lastUpdatedTimestamp;
        return rewardsPerSecond * timePassed;
    }
}
