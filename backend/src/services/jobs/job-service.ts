import type { JobStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { encryptTargetUrl, decryptTargetUrl } from "../../lib/encryption.js";
import { splitPayout } from "../../lib/ledger-math.js";
import { userAccountId } from "../../config/constants.js";
import { AppError } from "../../middleware/error-handler.js";
import { getSettlementEngine } from "../settlement/index.js";
import { enqueueJob, removeFromQueue } from "./queue.js";
import { createHash, randomBytes } from "node:crypto";

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ESCROW_LOCKED"],
  ESCROW_LOCKED: ["QUEUED"],
  QUEUED: ["CLAIMED", "REFUNDED"],
  CLAIMED: ["EXECUTING", "REFUNDED"],
  EXECUTING: ["RESULT_SUBMITTED", "REFUNDED"],
  RESULT_SUBMITTED: ["VERIFYING", "SETTLED", "DISPUTED", "REFUNDED"],
  VERIFYING: ["SETTLED", "REFUNDED"],
  SETTLED: [],
  REFUNDED: [],
  DISPUTED: ["SLASHED", "SETTLED"],
  SLASHED: [],
};

export class JobService {
  private ledger = getSettlementEngine();

  async createJob(input: {
    requesterId: string;
    targetUrl: string;
    outputFormat: import("@prisma/client").OutputFormat;
    maxFee: bigint;
    tip: bigint;
    verificationMode: import("@prisma/client").VerificationMode;
    ttlHours?: number;
  }) {
    const encryptedUrl = encryptTargetUrl(input.targetUrl);
    const ttlExpiresAt = new Date(
      Date.now() + (input.ttlHours ?? 24) * 60 * 60 * 1000,
    );
    const fee = input.maxFee + input.tip;
    const payer = userAccountId(input.requesterId);

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          requesterId: input.requesterId,
          targetUrl: encryptedUrl,
          outputFormat: input.outputFormat,
          maxFee: input.maxFee,
          tip: input.tip,
          status: "SUBMITTED",
          verificationMode: input.verificationMode,
          ttlExpiresAt,
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: created.id,
          fromState: null,
          toState: "SUBMITTED",
          actor: input.requesterId,
          reason: "Job created",
        },
      });

      return created;
    });

    await this.ledger.lockEscrow(job.id, payer, fee);

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: job.id },
        data: { status: "ESCROW_LOCKED" },
      });
      await tx.escrow.create({
        data: {
          jobId: job.id,
          payer,
          amount: fee,
          status: "LOCKED",
        },
      });
      await tx.jobEvent.create({
        data: {
          jobId: job.id,
          fromState: "SUBMITTED",
          toState: "ESCROW_LOCKED",
          actor: input.requesterId,
          reason: "Escrow locked",
        },
      });
    });

    await this.transition(job.id, "QUEUED", input.requesterId, "Queued for workers");
    await enqueueJob(job.id);

    return job;
  }

  async transition(
    jobId: string,
    toState: JobStatus,
    actor: string,
    reason?: string,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job) {
        throw new AppError(404, "Job not found", "not_found");
      }

      const allowed = TRANSITIONS[job.status];
      if (!allowed.includes(toState)) {
        throw new AppError(
          400,
          `Illegal transition ${job.status} → ${toState}`,
          "invalid_transition",
        );
      }

      await tx.job.update({
        where: { id: jobId },
        data: {
          status: toState,
          ...(toState === "SETTLED" ? { settledAt: new Date() } : {}),
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          fromState: job.status,
          toState,
          actor,
          reason,
        },
      });
    });
  }

  async claimJob(jobId: string, workerUserId: string, workerId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job || job.status !== "QUEUED" || job.claimedByWorkerId) {
        throw new AppError(409, "Job already claimed or unavailable", "claim_failed");
      }

      await tx.job.update({
        where: { id: jobId },
        data: { status: "CLAIMED", claimedByWorkerId: workerId },
      });
      await tx.jobEvent.create({
        data: {
          jobId,
          fromState: "QUEUED",
          toState: "CLAIMED",
          actor: workerUserId,
          reason: "Worker claimed job",
        },
      });
      await tx.job.update({
        where: { id: jobId },
        data: { status: "EXECUTING" },
      });
      await tx.jobEvent.create({
        data: {
          jobId,
          fromState: "CLAIMED",
          toState: "EXECUTING",
          actor: workerUserId,
          reason: "Execution started",
        },
      });
    });

    await removeFromQueue(jobId);
  }

  async submitResult(
    jobId: string,
    workerUserId: string,
    workerId: string,
    result: { resultHash: string; resultPointer: string; statusCode: number },
  ): Promise<void> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.claimedByWorkerId !== workerId) {
      throw new AppError(403, "Not the claiming worker", "forbidden");
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        resultHash: result.resultHash,
        resultPointer: result.resultPointer,
        status: "RESULT_SUBMITTED",
      },
    });

    await prisma.jobEvent.create({
      data: {
        jobId,
        fromState: "EXECUTING",
        toState: "RESULT_SUBMITTED",
        actor: workerUserId,
        reason: `HTTP ${result.statusCode}`,
      },
    });

    if (job.verificationMode === "OPTIMISTIC") {
      await this.settleJob(jobId, workerUserId, workerId);
    }
  }

  async settleJob(jobId: string, actor: string, workerId: string): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { escrow: true },
    });
    if (!job?.escrow || job.escrow.status !== "LOCKED") {
      throw new AppError(400, "Escrow not locked", "invalid_escrow");
    }

    const total = job.escrow.amount;
    const split = splitPayout(total);

    await this.ledger.releaseToParties(jobId, split);
    await this.ledger.creditEarnings(job.publisherId, workerId, split);

    const domain = job.publisherId
      ? (
          await prisma.publisher.findUnique({
            where: { id: job.publisherId },
            select: { domain: true },
          })
        )?.domain
      : null;

    const receiptSig = createHash("sha256")
      .update(`${jobId}:${job.resultHash}:${randomBytes(8).toString("hex")}`)
      .digest("hex");

    await prisma.$transaction(async (tx) => {
      await tx.escrow.update({
        where: { jobId },
        data: { status: "RELEASED" },
      });
      await tx.provenanceReceipt.create({
        data: {
          jobId,
          contentHash: job.resultHash ?? "",
          crawledAt: new Date(),
          publisherDomain: domain,
          signature: receiptSig,
          licenseTerms: "PayPerCrawl paid crawl — Base settlement",
        },
      });
      await tx.job.update({
        where: { id: jobId },
        data: { status: "SETTLED", settledAt: new Date() },
      });
      await tx.jobEvent.create({
        data: {
          jobId,
          fromState: job.status,
          toState: "SETTLED",
          actor,
          reason: "Payout released",
        },
      });
    });
  }

  decryptUrlForActor(encrypted: string): string {
    return decryptTargetUrl(encrypted);
  }
}

export const jobService = new JobService();
