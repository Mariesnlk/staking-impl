// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IAPR {

    /// @notice get annual percentage rate
    /// @return APR - calculated apr in percentage
    /// @param distributionPerSecond - distrubuted amount of tokens per second
    /// @param stakeTokenTotalSupply - staked tokens total supply 
    function getAPR(
        uint256 distributionPerSecond,
        uint256 stakeTokenTotalSupply
    ) external returns(uint256 APR);
}
