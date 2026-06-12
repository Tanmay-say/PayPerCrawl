// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPayPerCrawlRegistry {
    function getSite(bytes32 siteId)
        external
        view
        returns (address publisher, uint256 priceMicros, bool active, string memory domain);
}
