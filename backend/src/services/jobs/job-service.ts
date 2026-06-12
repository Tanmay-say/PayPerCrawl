import type { JobStatus } from "@prisma/client";

/**
 * Single source of truth for job state transitions.
 * Implementation: Step 2.
 */
export class JobService {
  async transition(
    _jobId: string,
    _toState: JobStatus,
    _actor: string,
    _reason?: string,
  ): Promise<void> {
    throw new Error("JobService.transition not implemented");
  }
}
