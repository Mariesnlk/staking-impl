// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../staking/stk/StkStaking.sol";

contract StkStakingMock is StkStaking {
    constructor(address _stakedToken, string memory _stkName, string memory _stkSymbol) 
        StkStaking(_stakedToken,  _stkName, _stkSymbol) {}

    function convertToStkTokens(uint256 _amount)
        external
        view
        returns (uint256)
    {
        return _convertToStkToken(_amount);
    }

    function convertToStakedTokens(uint256 _amount)
        external
        view
        returns (uint256)
    {
        return _convertToStakedToken(_amount);
    }

    function calculateRewards() external view returns (uint256) {
        return _calculateReward();
    }
}
