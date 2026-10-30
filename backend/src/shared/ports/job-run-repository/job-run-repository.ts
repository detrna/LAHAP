export * from "./errors.js";

export type JobRunStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface JobRunRecord {
    readonly id: string;
    readonly jobName: string;
    readonly status: JobRunStatus;
    readonly startedAt: Date;
    readonly finishedAt: Date | null;
    readonly error: string | null;
}

export interface JobRunRepository {
    /**
     * Records the start of a job execution with status "RUNNING".
     */
    recordStarted(jobName: string, startedAt?: Date): Promise<JobRunRecord>;

    /**
     * Marks an in-progress job run as "SUCCESS" and sets finishedAt.
     */
    recordSuccess(id: string, finishedAt?: Date): Promise<JobRunRecord>;

    /**
     * Marks an in-progress job run as "FAILED" with the error message and sets finishedAt.
     */
    recordFailed(id: string, errorMessage: string, finishedAt?: Date): Promise<JobRunRecord>;
}

