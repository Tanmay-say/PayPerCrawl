// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPayPerCrawlRegistry} from "./interfaces/IPayPerCrawlRegistry.sol";

/// @title PayPerCrawlEscrow
/// @notice Atomic per-crawl payment + protocol-fee split. No settler, no held funds.
/// @dev Agent calls payForCrawl with a fresh nonce; USDC is split publisher / treasury in one tx.
contract PayPerCrawlEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IPayPerCrawlRegistry public immutable registry;
    address public immutable treasury;
    uint16 public immutable protocolFeeBps;

    /// @dev siteId => nonce => spent
    mapping(bytes32 => mapping(bytes32 => bool)) public usedNonces;

    error ZeroAddress();
    error InvalidBps();
    error NonceUsed();
    error SiteInactive();
    error InsufficientAmount();

    event CrawlPaid(
        bytes32 indexed siteId,
        address indexed agent,
        address indexed publisher,
        bytes32 nonce,
        uint256 amount,
        uint256 publisherCut,
        uint256 protocolCut
    );

    constructor(
        address usdc_,
        address registry_,
        address treasury_,
        uint16 protocolFeeBps_
    ) {
        if (usdc_ == address(0) || registry_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        if (protocolFeeBps_ > 10_000) revert InvalidBps();

        usdc = IERC20(usdc_);
        registry = IPayPerCrawlRegistry(registry_);
        treasury = treasury_;
        protocolFeeBps = protocolFeeBps_;
    }

    /// @notice Pay for a crawl. Splits USDC between publisher (90%) and treasury (10%) atomically.
    function payForCrawl(bytes32 siteId, bytes32 nonce, uint256 amount) external nonReentrant {
        if (usedNonces[siteId][nonce]) revert NonceUsed();

        (address publisher, uint256 priceMicros, bool active, ) = registry.getSite(siteId);
        if (!active || publisher == address(0)) revert SiteInactive();
        if (amount < priceMicros) revert InsufficientAmount();

        usedNonces[siteId][nonce] = true;

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        uint256 protocolCut = (amount * protocolFeeBps) / 10_000;
        uint256 publisherCut = amount - protocolCut;

        if (publisherCut > 0) {
            usdc.safeTransfer(publisher, publisherCut);
        }
        if (protocolCut > 0) {
            usdc.safeTransfer(treasury, protocolCut);
        }

        emit CrawlPaid(siteId, msg.sender, publisher, nonce, amount, publisherCut, protocolCut);
    }

    /// @notice Quick view used by the gateway / publisher dashboard.
    function isPaid(bytes32 siteId, bytes32 nonce) external view returns (bool) {
        return usedNonces[siteId][nonce];
    }
}
