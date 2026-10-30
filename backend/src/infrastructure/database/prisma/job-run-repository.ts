import {
    JobRunNotFoundError,
    JobRunRepositoryFailureError,
    type JobRunRecord,
    type JobRunRepository,
    type JobRunStatus,
} from "../../../shared/ports/job-run-repository/job-run-repository.js";
import type { Db } from "./db.js";

const toJobRunStatus = (status: string): JobRunStatus => {
    if (status === "RUNNING" || status === "SUCCESS" || status === "FAILED") {
        return status;
    }
    return "RUNNING";
};

const toJobRunRecord = (row: {
    id: string;
    jobName: string;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    error: string | null;
}): JobRunRecord => ({
    id: row.id,
    jobName: row.jobName,
    status: toJobRunStatus(row.status),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    error: row.error,
});

export class PrismaJobRunRepository implements JobRunRepository {
    constructor(private readonly db: Db) {}

    async recordStarted(jobName: string, startedAt: Date = new Date()): Promise<JobRunRecord> {
        try {
            const row = await this.db.orm.public.JobRun.create({
                jobName,
                status: "RUNNING",
                startedAt,
                finishedAt: null,
                error: null,
            });
            return toJobRunRecord(row);
        } catch (error) {
            throw new JobRunRepositoryFailureError("recordStarted", error);
        }
    }

    async recordSuccess(id: string, finishedAt: Date = new Date()): Promise<JobRunRecord> {
        try {
            const updated = await this.db.orm.public.JobRun.where({ id }).update({
                status: "SUCCESS",
                finishedAt,
                error: null,
            });

            if (!updated) {
                throw new JobRunNotFoundError(id);
            }

            return toJobRunRecord(updated);
        } catch (error) {
            if (error instanceof JobRunNotFoundError) {
                throw error;
            }
            throw new JobRunRepositoryFailureError("recordSuccess", error);
        }
    }

    async recordFailed(
        id: string,
        errorMessage: string,
        finishedAt: Date = new Date(),
    ): Promise<JobRunRecord> {
        try {
            const updated = await this.db.orm.public.JobRun.where({ id }).update({
                status: "FAILED",
                finishedAt,
                error: errorMessage,
            });

            if (!updated) {
                throw new JobRunNotFoundError(id);
            }

            return toJobRunRecord(updated);
        } catch (error) {
            if (error instanceof JobRunNotFoundError) {
                throw error;
            }
            throw new JobRunRepositoryFailureError("recordFailed", error);
        }
    }
}

