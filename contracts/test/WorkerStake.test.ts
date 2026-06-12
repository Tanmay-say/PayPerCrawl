import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";

const CHALLENGER_REWARD_BPS = 2000;

describe("WorkerStake", function () {
  async function deployFixture() {
    const [deployer, worker, challenger] = await hre.viem.getWalletClients();

    const usdc = await hre.viem.deployContract("MockUSDC", []);
    const treasury = await hre.viem.deployContract("PayPerCrawlTreasury", [
      usdc.address,
      deployer.account.address,
    ]);
    const workerStake = await hre.viem.deployContract("WorkerStake", [
      usdc.address,
      treasury.address,
      deployer.account.address,
      CHALLENGER_REWARD_BPS,
    ]);

    const mintAmount = parseUnits("1000", 6);
    await usdc.write.mint([worker.account.address, mintAmount]);

    return { usdc, treasury, workerStake, deployer, worker, challenger };
  }

  it("stakes and tracks balance", async function () {
    const { usdc, workerStake, worker } = await deployFixture();
    const amount = parseUnits("100", 6);

    await usdc.write.approve([workerStake.address, amount], { account: worker.account });
    await workerStake.write.stake([amount], { account: worker.account });

    expect(await workerStake.read.stakedBalance([worker.account.address])).to.equal(amount);
  });

  it("slashes stake between challenger and treasury", async function () {
    const { usdc, treasury, workerStake, deployer, worker, challenger } = await deployFixture();
    const amount = parseUnits("50", 6);

    await usdc.write.approve([workerStake.address, amount], { account: worker.account });
    await workerStake.write.stake([amount], { account: worker.account });

    const slashAmount = parseUnits("10", 6);
    const challengerReward = (slashAmount * BigInt(CHALLENGER_REWARD_BPS)) / 10_000n;
    const treasuryAmount = slashAmount - challengerReward;

    await workerStake.write.slash(
      [worker.account.address, slashAmount, challenger.account.address, "bad crawl"],
      { account: deployer.account },
    );

    expect(await workerStake.read.stakedBalance([worker.account.address])).to.equal(
      amount - slashAmount,
    );
    expect(await usdc.read.balanceOf([challenger.account.address])).to.equal(challengerReward);
    expect(await usdc.read.balanceOf([treasury.address])).to.equal(treasuryAmount);
  });

  it("requires lock period before unstake", async function () {
    const { usdc, workerStake, worker } = await deployFixture();
    const amount = parseUnits("20", 6);

    await usdc.write.approve([workerStake.address, amount], { account: worker.account });
    await workerStake.write.stake([amount], { account: worker.account });
    await workerStake.write.requestUnstake([amount], { account: worker.account });

    await expect(workerStake.write.executeUnstake({ account: worker.account })).to.be.rejected;

    await hre.network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine", []);

    const before = await usdc.read.balanceOf([worker.account.address]);
    await workerStake.write.executeUnstake({ account: worker.account });
    const after = await usdc.read.balanceOf([worker.account.address]);

    expect(after - before).to.equal(amount);
    expect(await workerStake.read.stakedBalance([worker.account.address])).to.equal(0n);
  });

  it("rejects slash from non-settler", async function () {
    const { usdc, workerStake, worker, challenger } = await deployFixture();
    const amount = parseUnits("10", 6);

    await usdc.write.approve([workerStake.address, amount], { account: worker.account });
    await workerStake.write.stake([amount], { account: worker.account });

    await expect(
      workerStake.write.slash(
        [worker.account.address, parseUnits("1", 6), challenger.account.address, "x"],
        { account: worker.account },
      ),
    ).to.be.rejected;
  });
});
