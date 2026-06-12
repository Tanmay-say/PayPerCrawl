// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PayPerCrawlRegistry
/// @notice Maps a publisher-owned site (domain) to a price and recipient wallet.
/// @dev siteId = keccak256(abi.encode(publisher, domain)) — deterministic per (owner, domain).
contract PayPerCrawlRegistry {
    struct Site {
        address publisher;
        uint256 priceMicros; // USDC base units (6 decimals)
        bool active;
        string domain;
    }

    mapping(bytes32 siteId => Site) private _sites;

    error ZeroAddress();
    error ZeroPrice();
    error EmptyDomain();
    error SiteAlreadyExists();
    error SiteNotFound();
    error NotSiteOwner();

    event SiteRegistered(
        bytes32 indexed siteId,
        address indexed publisher,
        string domain,
        uint256 priceMicros
    );
    event SitePriceUpdated(bytes32 indexed siteId, uint256 newPriceMicros);
    event SiteActiveSet(bytes32 indexed siteId, bool active);
    event SiteTransferred(
        bytes32 indexed siteId,
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlySiteOwner(bytes32 siteId) {
        if (_sites[siteId].publisher == address(0)) revert SiteNotFound();
        if (_sites[siteId].publisher != msg.sender) revert NotSiteOwner();
        _;
    }

    function computeSiteId(address publisher, string calldata domain) public pure returns (bytes32) {
        return keccak256(abi.encode(publisher, domain));
    }

    function registerSite(string calldata domain, uint256 priceMicros) external returns (bytes32 siteId) {
        if (bytes(domain).length == 0) revert EmptyDomain();
        if (priceMicros == 0) revert ZeroPrice();

        siteId = computeSiteId(msg.sender, domain);
        Site storage site = _sites[siteId];
        if (site.publisher != address(0)) revert SiteAlreadyExists();

        site.publisher = msg.sender;
        site.priceMicros = priceMicros;
        site.active = true;
        site.domain = domain;

        emit SiteRegistered(siteId, msg.sender, domain, priceMicros);
    }

    function updatePrice(bytes32 siteId, uint256 newPriceMicros) external onlySiteOwner(siteId) {
        if (newPriceMicros == 0) revert ZeroPrice();
        _sites[siteId].priceMicros = newPriceMicros;
        emit SitePriceUpdated(siteId, newPriceMicros);
    }

    function setActive(bytes32 siteId, bool active) external onlySiteOwner(siteId) {
        _sites[siteId].active = active;
        emit SiteActiveSet(siteId, active);
    }

    function transferSite(bytes32 siteId, address newOwner) external onlySiteOwner(siteId) {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = _sites[siteId].publisher;
        _sites[siteId].publisher = newOwner;
        emit SiteTransferred(siteId, previous, newOwner);
    }

    function getSite(bytes32 siteId)
        external
        view
        returns (address publisher, uint256 priceMicros, bool active, string memory domain)
    {
        Site storage site = _sites[siteId];
        return (site.publisher, site.priceMicros, site.active, site.domain);
    }
}
