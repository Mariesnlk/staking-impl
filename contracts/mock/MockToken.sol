// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MockToken is ERC20Burnable {
  constructor() ERC20("MockToken", "MK") {
    _mint(msg.sender, 100_000_000 ether);
  }

  function mint(uint256 amount) external {
    _mint(msg.sender, amount);
  }
}
