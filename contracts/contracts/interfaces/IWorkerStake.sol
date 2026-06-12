// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWorkerStake {
    event Staked(address indexed worker, uint256 amount);
    event UnstakeRequested(address indexed worker, uint256 amount, uint256 unlockAt);
    event Unstaked(address indexed worker, uint256 amount);
    event Slashed(
        address indexed worker,
        address indexed challenger,
        uint256 amount,
        uint256 challengerReward,
        uint256 treasuryAmount,
        string reason
    );

    function stake(uint256 amount) external;

    function requestUnstake(uint256 amount) external;

    function executeUnstake() external;

    function slash(address worker, uint256 amount, address challenger, string calldata reason) external;

    function stakedBalance(address worker) external view returns (uint256);

    function pendingUnstake(address worker) external view returns (uint256 amount, uint256 unlockAt);
}
