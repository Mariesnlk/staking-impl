// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice ERC20 token with minting and burning fnctionality
interface IStkToken is IERC20 {
    /// @notice creates `amount` tokens and assigns them to `account`, increasing the total supply.
    /// @param account - address of the recipient
    /// param amount - number of tokens to mint
    function mint(address account, uint256 amount) external;

    /// @notice destroys `amount` tokens from `account`, reducing the total supply.
    /// @param account - address of the sender
    /// param amount - number of tokens to burn
    function burn(address account, uint256 amount) external;
}