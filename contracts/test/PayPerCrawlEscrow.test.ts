import { expect } from "chai";
import hre from "hardhat";
import { getAddress, keccak256, parseUnits, toBytes } from "viem";

const PROTOCOL_BPS = 1000; // 10%

describe("PayPerCrawl direct-split escrow", function () {
  async function deployFixture() {
    const [deployer, publisher, agent, otherPublisher] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const usdc = await hre.viem.deployContract("MockUSDC", []);
    const treasury = await hre.viem.deployContract("PayPerCrawlTreasury", [
      usdc.address,
      deployer.account.address,
    ]);
    const registry = await hre.viem.deployContract("PayPerCrawlRegistry", []);
    const escrow = await hre.viem.deployContract("PayPerCrawlEscrow", [
      usdc.address,
      registry.address,
      treasury.address,
      PROTOCOL_BPS,
    ]);

    const mintAmount = parseUnits("1000", 6);
    await usdc.write.mint([agent.account.address, mintAmount]);

    return {
      usdc,
      treasury,
      registry,
      escrow,
      deployer,
      publisher,
      otherPublisher,
      agent,
      publicClient,
    };
  }

  it("registers a site with deterministic siteId", async function () {
    const { registry, publisher } = await deployFixture();
    const domain = "demo.example.com";
    const price = parseUnits("0.001", 6);

    const expectedId = await registry.read.computeSiteId([publisher.account.address, domain]);
    await registry.write.registerSite([domain, price], { account: publisher.account });

    const site = await registry.read.getSite([expectedId]);
    expect(getAddress(site[0])).to.equal(getAddress(publisher.account.address));
    expect(site[1]).to.equal(price);
    expect(site[2]).to.equal(true);
    expect(site[3]).to.equal(domain);
  });

  it("rejects duplicate site registration by same owner+domain", async function () {
    const { registry, publisher } = await deployFixture();
    const domain = "dup.example.com";
    const price = parseUnits("0.001", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    await expect(
      registry.write.registerSite([domain, price], { account: publisher.account }),
    ).to.be.rejected;
  });

  it("splits payment 90/10 between publisher and treasury", async function () {
    const { usdc, treasury, registry, escrow, publisher, agent } = await deployFixture();
    const domain = "split.example.com";
    const price = parseUnits("0.001", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    const siteId = await registry.read.computeSiteId([publisher.account.address, domain]);

    const nonce = keccak256(toBytes("nonce-1"));
    await usdc.write.approve([escrow.address, price], { account: agent.account });
    await escrow.write.payForCrawl([siteId, nonce, price], { account: agent.account });

    const protocolCut = (price * BigInt(PROTOCOL_BPS)) / 10_000n;
    const publisherCut = price - protocolCut;

    expect(await usdc.read.balanceOf([publisher.account.address])).to.equal(publisherCut);
    expect(await usdc.read.balanceOf([treasury.address])).to.equal(protocolCut);
    expect(await escrow.read.isPaid([siteId, nonce])).to.equal(true);
  });

  it("rejects nonce replay", async function () {
    const { usdc, registry, escrow, publisher, agent } = await deployFixture();
    const domain = "replay.example.com";
    const price = parseUnits("0.001", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    const siteId = await registry.read.computeSiteId([publisher.account.address, domain]);
    const nonce = keccak256(toBytes("replay-nonce"));

    await usdc.write.approve([escrow.address, price * 2n], { account: agent.account });
    await escrow.write.payForCrawl([siteId, nonce, price], { account: agent.account });
    await expect(
      escrow.write.payForCrawl([siteId, nonce, price], { account: agent.account }),
    ).to.be.rejected;
  });

  it("rejects payment below site price", async function () {
    const { usdc, registry, escrow, publisher, agent } = await deployFixture();
    const domain = "underpay.example.com";
    const price = parseUnits("0.001", 6);
    const tooLow = parseUnits("0.0005", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    const siteId = await registry.read.computeSiteId([publisher.account.address, domain]);

    await usdc.write.approve([escrow.address, price], { account: agent.account });
    await expect(
      escrow.write.payForCrawl([siteId, keccak256(toBytes("low")), tooLow], {
        account: agent.account,
      }),
    ).to.be.rejected;
  });

  it("rejects payment to inactive site", async function () {
    const { usdc, registry, escrow, publisher, agent } = await deployFixture();
    const domain = "inactive.example.com";
    const price = parseUnits("0.001", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    const siteId = await registry.read.computeSiteId([publisher.account.address, domain]);
    await registry.write.setActive([siteId, false], { account: publisher.account });

    await usdc.write.approve([escrow.address, price], { account: agent.account });
    await expect(
      escrow.write.payForCrawl([siteId, keccak256(toBytes("ina")), price], {
        account: agent.account,
      }),
    ).to.be.rejected;
  });

  it("only owner can update price / toggle active / transfer site", async function () {
    const { registry, publisher, otherPublisher } = await deployFixture();
    const domain = "owner.example.com";
    const price = parseUnits("0.001", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    const siteId = await registry.read.computeSiteId([publisher.account.address, domain]);

    await expect(
      registry.write.updatePrice([siteId, parseUnits("0.002", 6)], {
        account: otherPublisher.account,
      }),
    ).to.be.rejected;
    await expect(
      registry.write.setActive([siteId, false], { account: otherPublisher.account }),
    ).to.be.rejected;

    await registry.write.updatePrice([siteId, parseUnits("0.005", 6)], {
      account: publisher.account,
    });
    const updated = await registry.read.getSite([siteId]);
    expect(updated[1]).to.equal(parseUnits("0.005", 6));
  });

  it("emits CrawlPaid with full split detail", async function () {
    const { usdc, registry, escrow, publisher, agent, publicClient } = await deployFixture();
    const domain = "event.example.com";
    const price = parseUnits("0.001", 6);

    await registry.write.registerSite([domain, price], { account: publisher.account });
    const siteId = await registry.read.computeSiteId([publisher.account.address, domain]);
    const nonce = keccak256(toBytes("evt-nonce"));

    await usdc.write.approve([escrow.address, price], { account: agent.account });
    const txHash = await escrow.write.payForCrawl([siteId, nonce, price], {
      account: agent.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const logs = await escrow.getEvents.CrawlPaid();
    expect(logs.length).to.be.greaterThan(0);
    const lastLog = logs[logs.length - 1];
    expect(lastLog.args.siteId).to.equal(siteId);
    expect(lastLog.args.nonce).to.equal(nonce);
    expect(getAddress(lastLog.args.agent!)).to.equal(getAddress(agent.account.address));
    expect(getAddress(lastLog.args.publisher!)).to.equal(getAddress(publisher.account.address));
    expect(siteId.startsWith("0x")).to.equal(true);
  });
});
