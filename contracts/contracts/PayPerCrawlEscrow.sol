// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPayPerCrawlEscrow} from "./interfaces/IPayPerCrawlEscrow.sol";

/// @title PayPerCrawlEscrow
/// @notice Locks USDC per job; settler releases split or refunds payer.
contract PayPerCrawlEscrow is IPayPerCrawlEscrow, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct EscrowRecord {
        uint256 amount;
        address payer;
        EscrowStatus status;
    }

    IERC20 public immutable usdc;
    address public immutable treasury;
    address public settler;

    uint16 public immutable publisherShareBps;
    uint16 public immutable workerShareBps;
    uint16 public immutable protocolFeeBps;

    mapping(bytes32 jobId => EscrowRecord) private _escrows;

    error ZeroAddress();
    error InvalidBps();
    error NotSettler();
    error EscrowAlreadyExists();
    error EscrowNotLocked();
    error EscrowAlreadyFinalized();
    error ZeroAmount();

    modifier onlySettler() {
        if (msg.sender != settler) revert NotSettler();
        _;
    }

    constructor(
        address usdc_,
        address treasury_,
        address settler_,
        uint16 publisherShareBps_,
        uint16 workerShareBps_,
        uint16 protocolFeeBps_
    ) {
        if (usdc_ == address(0) || treasury_ == address(0) || settler_ == address(0)) {
            revert ZeroAddress();
        }
        if (uint256(publisherShareBps_) + workerShareBps_ + protocolFeeBps_ != 10_000) {
            revert InvalidBps();
        }

        usdc = IERC20(usdc_);
        treasury = treasury_;
        settler = settler_;
        publisherShareBps = publisherShareBps_;
        workerShareBps = workerShareBps_;
        protocolFeeBps = protocolFeeBps_;
    }

    function setSettler(address newSettler) external onlySettler {
        if (newSettler == address(0)) revert ZeroAddress();
        settler = newSettler;
    }

    function lockEscrow(bytes32 jobId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        EscrowRecord storage record = _escrows[jobId];
        if (record.status != EscrowStatus.None) revert EscrowAlreadyExists();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        record.amount = amount;
        record.payer = msg.sender;
        record.status = EscrowStatus.Locked;

        emit EscrowLocked(jobId, msg.sender, amount);
    }

    function releaseToParties(bytes32 jobId, address publisher, address worker)
        external
        onlySettler
        nonReentrant
    {
        if (publisher == address(0) || worker == address(0)) revert ZeroAddress();

        EscrowRecord storage record = _escrows[jobId];
        if (record.status != EscrowStatus.Locked) revert EscrowNotLocked();

        uint256 total = record.amount;
        uint256 publisherAmount = (total * publisherShareBps) / 10_000;
        uint256 workerAmount = (total * workerShareBps) / 10_000;
        uint256 protocolAmount = total - publisherAmount - workerAmount;

        record.status = EscrowStatus.Released;

        usdc.safeTransfer(publisher, publisherAmount);
        usdc.safeTransfer(worker, workerAmount);
        if (protocolAmount > 0) {
            usdc.safeTransfer(treasury, protocolAmount);
        }

        emit EscrowReleased(jobId, publisher, worker, publisherAmount, workerAmount, protocolAmount);
    }

    function refund(bytes32 jobId) external onlySettler nonReentrant {
        EscrowRecord storage record = _escrows[jobId];
        if (record.status != EscrowStatus.Locked) revert EscrowNotLocked();

        uint256 amount = record.amount;
        address payer = record.payer;

        record.status = EscrowStatus.Refunded;

        usdc.safeTransfer(payer, amount);

        emit EscrowRefunded(jobId, payer, amount);
    }

    function getEscrow(bytes32 jobId)
        external
        view
        returns (uint256 amount, address payer, EscrowStatus status)
    {
        EscrowRecord storage record = _escrows[jobId];
        return (record.amount, record.payer, record.status);
    }
}
