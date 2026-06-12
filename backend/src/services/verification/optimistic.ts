import type { Job } from "@prisma/client";
import type {
  ResultSubmission,
  VerificationOutcome,
  VerificationStrategy,
} from "../../types/verification.js";

/** V1 hash-commit verification. zkTLS in V2. */
export class OptimisticVerification implements VerificationStrategy {
  readonly mode = "OPTIMISTIC" as const;

  async verify(_job: Job, _submission: ResultSubmission): Promise<VerificationOutcome> {
    throw new Error("OptimisticVerification.verify not implemented");
  }
}
