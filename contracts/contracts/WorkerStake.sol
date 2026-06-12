// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IWorkerStake} from "./interfaces/IWorkerStake.sol";

/// @title WorkerStake
/// @notice Worker collateral staking with timelocked unstake and settler-driven slashing.
contract WorkerStake is IWorkerStake, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public immutable treasury;
    address public settler;

    uint256 public constant UNSTAKE_LOCK_PERIOD = 7 days;
    uint16 public immutable challengerRewardBps;

    mapping(address worker => uint256) private _staked;
    mapping(address worker => uint256) private _pendingUnstake;
    mapping(address worker => uint256) private _unlockAt;

    error ZeroAddress();
    error NotSettler();
    error ZeroAmount();
    error InsufficientStake();
    error UnstakeNotReady();
    error NothingToUnstake();
    error InvalidBps();

    modifier onlySettler() {
        if (msg.sender != settler) revert NotSettler();
        _;
    }

    constructor(address usdc_, address treasury_, address settler_, uint16 challengerRewardBps_) {
        if (usdc_ == address(0) || treasury_ == address(0) || settler_ == address(0)) {
            revert ZeroAddress();
        }
        if (challengerRewardBps_ > 10_000) revert InvalidBps();

        usdc = IERC20(usdc_);
        treasury = treasury_;
        settler = settler_;
        challengerRewardBps = challengerRewardBps_;
    }

    function setSettler(address newSettler) external onlySettler {
        if (newSettler == address(0)) revert ZeroAddress();
        settler = newSettler;
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        _staked[msg.sender] += amount;

        emit Staked(msg.sender, amount);
    }

    function requestUnstake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (_staked[msg.sender] < amount) revert InsufficientStake();

        _staked[msg.sender] -= amount;
        _pendingUnstake[msg.sender] += amount;
        _unlockAt[msg.sender] = block.timestamp + UNSTAKE_LOCK_PERIOD;

        emit UnstakeRequested(msg.sender, amount, _unlockAt[msg.sender]);
    }

    function executeUnstake() external nonReentrant {
        uint256 amount = _pendingUnstake[msg.sender];
        if (amount == 0) revert NothingToUnstake();
        if (block.timestamp < _unlockAt[msg.sender]) revert UnstakeNotReady();

        _pendingUnstake[msg.sender] = 0;
        _unlockAt[msg.sender] = 0;

        usdc.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function slash(address worker, uint256 amount, address challenger, string calldata reason)
        external
        onlySettler
        nonReentrant
    {
        if (worker == address(0) || challenger == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_staked[worker] < amount) revert InsufficientStake();

        _staked[worker] -= amount;

        uint256 challengerReward = (amount * challengerRewardBps) / 10_000;
        uint256 treasuryAmount = amount - challengerReward;

        if (challengerReward > 0) {
            usdc.safeTransfer(challenger, challengerReward);
        }
        if (treasuryAmount > 0) {
            usdc.safeTransfer(treasury, treasuryAmount);
        }

        emit Slashed(worker, challenger, amount, challengerReward, treasuryAmount, reason);
    }

    function stakedBalance(address worker) external view returns (uint256) {
        return _staked[worker];
    }

    function pendingUnstake(address worker) external view returns (uint256 amount, uint256 unlockAt) {
        return (_pendingUnstake[worker], _unlockAt[worker]);
    }
}
