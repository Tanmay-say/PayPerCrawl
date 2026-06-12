import type { Job } from "@prisma/client";

export type VerificationMode = "OPTIMISTIC" | "ZKTLS";

export interface ResultSubmission {
  resultHash: string;
  resultPointer: string;
  statusCode: number;
}

export interface VerificationOutcome {
  accepted: boolean;
  reason?: string;
}

export interface VerificationStrategy {
  mode: VerificationMode;
  verify(job: Job, submission: ResultSubmission): Promise<VerificationOutcome>;
}
