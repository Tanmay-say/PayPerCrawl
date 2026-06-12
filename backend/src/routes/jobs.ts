import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error-handler.js";
import { createJobSchema, submitResultSchema } from "../schemas/jobs.js";
import { disputeSchema } from "../schemas/disputes.js";
import { prisma } from "../lib/prisma.js";
import { jobService } from "../services/jobs/job-service.js";
import { listQueuedJobIds } from "../services/jobs/queue.js";
import { rateLimitJobs } from "../middleware/rate-limit.js";
import { paramId } from "../lib/params.js";

export const jobsRouter = Router();

jobsRouter.get("/available", requireAuth, async (req, res, next) => {
  try {
    const worker = await prisma.worker.findUnique({ where: { userId: req.userId! } });
    if (!worker) {
      throw new AppError(403, "Worker profile required", "forbidden");
    }

    const queuedIds = await listQueuedJobIds();
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: queuedIds },
        status: "QUEUED",
      },
      select: {
        id: true,
        outputFormat: true,
        maxFee: true,
        tip: true,
        verificationMode: true,
        ttlExpiresAt: true,
        createdAt: true,
      },
    });

    const filtered = jobs.filter((j) => {
      const fee = j.maxFee + j.tip;
      return fee >= worker.minFee;
    });

    res.json({
      jobs: filtered.map((j) => ({
        ...j,
        maxFee: j.maxFee.toString(),
        tip: j.tip.toString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/", requireAuth, rateLimitJobs, validate(createJobSchema), async (req, res, next) => {
  try {
    if (req.userRole !== "REQUESTER" && req.userRole !== "ADMIN") {
      throw new AppError(403, "Requester role required", "forbidden");
    }

    const body = req.body as {
      targetUrl: string;
      outputFormat: import("@prisma/client").OutputFormat;
      maxFee: string;
      tip: string;
      verificationMode: import("@prisma/client").VerificationMode;
    };

    const job = await jobService.createJob({
      requesterId: req.userId!,
      targetUrl: body.targetUrl,
      outputFormat: body.outputFormat,
      maxFee: BigInt(body.maxFee),
      tip: BigInt(body.tip ?? "0"),
      verificationMode: body.verificationMode,
    });

    res.status(201).json({
      id: job.id,
      status: "QUEUED",
      maxFee: job.maxFee.toString(),
      tip: job.tip.toString(),
    });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const jobId = paramId(req, "id");
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { provenanceReceipt: true },
    });
    if (!job) {
      throw new AppError(404, "Job not found", "not_found");
    }

    const isRequester = job.requesterId === req.userId;
    const worker = await prisma.worker.findUnique({ where: { userId: req.userId! } });
    const isClaimer = worker && job.claimedByWorkerId === worker.id;

    let targetUrl: string | undefined;
    if (isRequester || isClaimer) {
      targetUrl = jobService.decryptUrlForActor(job.targetUrl);
    }

    res.json({
      id: job.id,
      status: job.status,
      outputFormat: job.outputFormat,
      maxFee: job.maxFee.toString(),
      tip: job.tip.toString(),
      resultHash: job.resultHash,
      resultPointer: isRequester || isClaimer ? job.resultPointer : undefined,
      targetUrl,
      settledAt: job.settledAt,
    });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get("/:id/receipt", requireAuth, async (req, res, next) => {
  try {
    const jobId = paramId(req, "id");
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { provenanceReceipt: true },
    });
    if (!job?.provenanceReceipt) {
      throw new AppError(404, "Receipt not found", "not_found");
    }
    if (job.requesterId !== req.userId) {
      throw new AppError(403, "Forbidden", "forbidden");
    }
    res.json(job.provenanceReceipt);
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/:id/claim", requireAuth, async (req, res, next) => {
  try {
    const worker = await prisma.worker.findUnique({ where: { userId: req.userId! } });
    if (!worker) {
      throw new AppError(403, "Worker profile required", "forbidden");
    }

    const jobId = paramId(req, "id");
    await jobService.claimJob(jobId, req.userId!, worker.id);
    const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });

    res.json({
      id: job.id,
      status: job.status,
      targetUrl: jobService.decryptUrlForActor(job.targetUrl),
    });
  } catch (err) {
    next(err);
  }
});

jobsRouter.post(
  "/:id/result",
  requireAuth,
  validate(submitResultSchema),
  async (req, res, next) => {
    try {
      const worker = await prisma.worker.findUnique({ where: { userId: req.userId! } });
      if (!worker) {
        throw new AppError(403, "Worker profile required", "forbidden");
      }

      const jobId = paramId(req, "id");
      await jobService.submitResult(jobId, req.userId!, worker.id, req.body);
      const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
      res.json({ id: job.id, status: job.status });
    } catch (err) {
      next(err);
    }
  },
);

jobsRouter.post(
  "/:id/dispute",
  requireAuth,
  rateLimitJobs,
  validate(disputeSchema),
  async (req, res, next) => {
    try {
      const { evidenceHash } = req.body as { evidenceHash: string };
      const jobId = paramId(req, "id");
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        throw new AppError(404, "Job not found", "not_found");
      }

      const dispute = await prisma.dispute.create({
        data: {
          jobId: job.id,
          challengerId: req.userId!,
          evidenceHash,
          status: "OPEN",
        },
      });

      await jobService.transition(job.id, "DISPUTED", req.userId!, "Dispute opened");
      res.status(201).json(dispute);
    } catch (err) {
      next(err);
    }
  },
);
