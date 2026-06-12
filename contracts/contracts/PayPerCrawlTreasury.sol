// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Protocol fee sink; owner may withdraw accumulated USDC.
contract PayPerCrawlTreasury is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    constructor(address usdc_, address owner_) Ownable(owner_) {
        require(usdc_ != address(0), "zero usdc");
        usdc = IERC20(usdc_);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        usdc.safeTransfer(to, amount);
    }
}
