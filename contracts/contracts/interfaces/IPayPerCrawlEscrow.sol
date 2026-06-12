// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPayPerCrawlEscrow {
    enum EscrowStatus {
        None,
        Locked,
        Released,
        Refunded
    }

    event EscrowLocked(bytes32 indexed jobId, address indexed payer, uint256 amount);
    event EscrowReleased(
        bytes32 indexed jobId,
        address indexed publisher,
        address indexed worker,
        uint256 publisherAmount,
        uint256 workerAmount,
        uint256 protocolAmount
    );
    event EscrowRefunded(bytes32 indexed jobId, address indexed payer, uint256 amount);

    function lockEscrow(bytes32 jobId, uint256 amount) external;

    function releaseToParties(bytes32 jobId, address publisher, address worker) external;

    function refund(bytes32 jobId) external;

    function getEscrow(bytes32 jobId)
        external
        view
        returns (uint256 amount, address payer, EscrowStatus status);
}
