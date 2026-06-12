import { expect } from "chai";
import hre from "hardhat";
import { getAddress, keccak256, parseUnits, toBytes } from "viem";

const PUBLISHER_BPS = 7000;
const WORKER_BPS = 2500;
const PROTOCOL_BPS = 500;

describe("PayPerCrawlEscrow", function () {
  async function deployFixture() {
    const [deployer, requester, publisher, worker] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const usdc = await hre.viem.deployContract("MockUSDC", []);
    const treasury = await hre.viem.deployContract("PayPerCrawlTreasury", [
      usdc.address,
      deployer.account.address,
    ]);
    const escrow = await hre.viem.deployContract("PayPerCrawlEscrow", [
      usdc.address,
      treasury.address,
      deployer.account.address,
      PUBLISHER_BPS,
      WORKER_BPS,
      PROTOCOL_BPS,
    ]);

    const mintAmount = parseUnits("1000", 6);
    await usdc.write.mint([requester.account.address, mintAmount]);
    await usdc.write.mint([deployer.account.address, mintAmount], {
      account: deployer.account,
    });

    return { usdc, treasury, escrow, deployer, requester, publisher, worker, publicClient };
  }

  it("locks escrow and releases with correct BPS split", async function () {
    const { usdc, treasury, escrow, deployer, requester, publisher, worker, publicClient } =
      await deployFixture();

    const jobId = keccak256(toBytes("job-1"));
    const amount = parseUnits("10", 6);

    await usdc.write.approve([escrow.address, amount], { account: requester.account });
    await escrow.write.lockEscrow([jobId, amount], { account: requester.account });

    const locked = await escrow.read.getEscrow([jobId]);
    expect(locked[0]).to.equal(amount);
    expect(getAddress(locked[1]!)).to.equal(getAddress(requester.account.address));
    expect(locked[2]).to.equal(1); // Locked

    await escrow.write.releaseToParties([jobId, publisher.account.address, worker.account.address], {
      account: deployer.account,
    });

    const publisherAmount = (amount * BigInt(PUBLISHER_BPS)) / 10_000n;
    const workerAmount = (amount * BigInt(WORKER_BPS)) / 10_000n;
    const protocolAmount = amount - publisherAmount - workerAmount;

    expect(await usdc.read.balanceOf([publisher.account.address])).to.equal(publisherAmount);
    expect(await usdc.read.balanceOf([worker.account.address])).to.equal(workerAmount);
    expect(await usdc.read.balanceOf([treasury.address])).to.equal(protocolAmount);

    const released = await escrow.read.getEscrow([jobId]);
    expect(released[2]).to.equal(2); // Released
  });

  it("refunds locked escrow to payer", async function () {
    const { usdc, escrow, deployer, requester, publicClient } = await deployFixture();

    const jobId = keccak256(toBytes("job-refund"));
    const amount = parseUnits("5", 6);

    const before = await usdc.read.balanceOf([requester.account.address]);

    await usdc.write.approve([escrow.address, amount], { account: requester.account });
    await escrow.write.lockEscrow([jobId, amount], { account: requester.account });
    await escrow.write.refund([jobId], { account: deployer.account });

    const after = await usdc.read.balanceOf([requester.account.address]);
    expect(after - before).to.equal(0n);

    const record = await escrow.read.getEscrow([jobId]);
    expect(record[2]).to.equal(3); // Refunded
  });

  it("reverts on double lock", async function () {
    const { usdc, escrow, requester } = await deployFixture();
    const jobId = keccak256(toBytes("job-double"));
    const amount = parseUnits("1", 6);

    await usdc.write.approve([escrow.address, amount * 2n], { account: requester.account });
    await escrow.write.lockEscrow([jobId, amount], { account: requester.account });

    await expect(
      escrow.write.lockEscrow([jobId, amount], { account: requester.account }),
    ).to.be.rejected;
  });

  it("reverts on double release", async function () {
    const { usdc, escrow, deployer, requester, publisher, worker } = await deployFixture();
    const jobId = keccak256(toBytes("job-double-release"));
    const amount = parseUnits("2", 6);

    await usdc.write.approve([escrow.address, amount], { account: requester.account });
    await escrow.write.lockEscrow([jobId, amount], { account: requester.account });
    await escrow.write.releaseToParties(
      [jobId, publisher.account.address, worker.account.address],
      { account: deployer.account },
    );

    await expect(
      escrow.write.releaseToParties(
        [jobId, publisher.account.address, worker.account.address],
        { account: deployer.account },
      ),
    ).to.be.rejected;
  });

  it("rejects release from non-settler", async function () {
    const { usdc, escrow, requester, publisher, worker } = await deployFixture();
    const jobId = keccak256(toBytes("job-settler"));
    const amount = parseUnits("1", 6);

    await usdc.write.approve([escrow.address, amount], { account: requester.account });
    await escrow.write.lockEscrow([jobId, amount], { account: requester.account });

    await expect(
      escrow.write.releaseToParties(
        [jobId, publisher.account.address, worker.account.address],
        { account: requester.account },
      ),
    ).to.be.rejected;
  });
});
