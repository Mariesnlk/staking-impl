// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../../interfaces/apr/IAPR.sol";

contract APR is IAPR {
    uint256 internal constant PRECISION_TEN_MILLION = 10_000_000;
    /// @notice timestamp 1 year in seconds
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    /// @notice get annual percentage rate
    /// @return APR - calculated apr in percentage
    /// @param distributionPerSecond - distrubuted amount of tokens per second
    /// @param stakeTokenTotalSupply - staked tokens total supply
    function getAPR(
        uint256 distributionPerSecond,
        uint256 stakeTokenTotalSupply
    ) external pure override returns (uint256 APR) {
        APR = _calculateAPR(distributionPerSecond, stakeTokenTotalSupply);
    }

    function _calculateAPR(
        uint256 distributionPerSecond,
        uint256 stakeTokenTotalSupply
    ) internal pure returns (uint256) {
        return
            (distributionPerSecond * SECONDS_PER_YEAR * PRECISION_TEN_MILLION) /
            stakeTokenTotalSupply;
    }
}
