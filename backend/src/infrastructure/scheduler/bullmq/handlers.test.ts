import { describe, expect, it, vi } from "vitest";
import type { SchedulerConfig } from "../../../config/scheduler.js";
import {
    JobRunNotFoundError,
    type JobRunRecord,
    type JobRunRepository,
} from "../../../shared/ports/job-run-repository/job-run-repository.js";
import type { RecurringJobRegistration, Scheduler } from "../../../shared/ports/scheduler/scheduler.js";
import { createScheduledCheckProcessor, createScheduledJobHandlerMap, defaultHeartbeatHandler } from "./handlers.js";
import { HEARTBEAT_JOB_NAME, HEARTBEAT_SCHEDULE_ID, registerSchedules } from "./register-schedules.js";

class InMemoryJobRunRepository implements JobRunRepository {
    readonly runs: JobRunRecord[] = [];
    private nextId = 1;

    async recordStarted(
        jobName: string,
        startedAt: Date = new Date("2026-10-29T17:00:00.000Z"),
    ): Promise<JobRunRecord> {
        const record: JobRunRecord = {
            id: `run-${this.nextId++}`,
            jobName,
            status: "RUNNING",
            startedAt,
            finishedAt: null,
            error: null,
        };
        this.runs.push(record);
        return record;
    }

    async recordSuccess(id: string, finishedAt: Date = new Date("2026-10-29T17:00:01.000Z")): Promise<JobRunRecord> {
        const index = this.runs.findIndex(r => r.id === id);
        if (index === -1) {
            throw new JobRunNotFoundError(id);
        }
        const updated: JobRunRecord = {
            ...this.runs[index]!,
            status: "SUCCESS",
            finishedAt,
            error: null,
        };
        this.runs[index] = updated;
        return updated;
    }

    async recordFailed(
        id: string,
        errorMessage: string,
        finishedAt: Date = new Date("2026-10-29T17:00:01.000Z"),
    ): Promise<JobRunRecord> {
        const index = this.runs.findIndex(r => r.id === id);
        if (index === -1) {
            throw new JobRunNotFoundError(id);
        }
        const updated: JobRunRecord = {
            ...this.runs[index]!,
            status: "FAILED",
            finishedAt,
            error: errorMessage,
        };
        this.runs[index] = updated;
        return updated;
    }
}

describe("Scheduler handlers and schedule registration", () => {
    it("maps 'heartbeat' job name to heartbeat handler and records started -> success in JobRunRepository", async () => {
        const executeSpy = vi.fn().mockResolvedValue({ status: "ok" });
        const jobRunRepo = new InMemoryJobRunRepository();
        const handlerMap = createScheduledJobHandlerMap({
            heartbeatHandler: executeSpy,
        });
        const processor = createScheduledCheckProcessor(handlerMap, jobRunRepo);

        await processor({
            id: "job-1",
            name: HEARTBEAT_JOB_NAME,
            data: {},
        });

        expect(executeSpy).toHaveBeenCalledTimes(1);
        expect(jobRunRepo.runs).toHaveLength(1);
        expect(jobRunRepo.runs[0]?.jobName).toBe(HEARTBEAT_JOB_NAME);
        expect(jobRunRepo.runs[0]?.status).toBe("SUCCESS");
        expect(jobRunRepo.runs[0]?.finishedAt).toBeInstanceOf(Date);
        expect(jobRunRepo.runs[0]?.error).toBeNull();
    });

    it("runs default heartbeat handler when no custom handler is provided", async () => {
        const jobRunRepo = new InMemoryJobRunRepository();
        const handlerMap = createScheduledJobHandlerMap();
        const processor = createScheduledCheckProcessor(handlerMap, jobRunRepo);

        await processor({
            id: "job-default-1",
            name: HEARTBEAT_JOB_NAME,
            data: {},
        });

        expect(jobRunRepo.runs).toHaveLength(1);
        expect(jobRunRepo.runs[0]?.status).toBe("SUCCESS");
    });

    it("defaultHeartbeatHandler returns status ok with a valid timestamp", async () => {
        const result = await defaultHeartbeatHandler();
        expect(result.status).toBe("ok");
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it("records FAILED with the error message and rethrows when a handler throws so BullMQ retries", async () => {
        const executeSpy = vi.fn().mockRejectedValue(new Error("database connection lost"));
        const jobRunRepo = new InMemoryJobRunRepository();
        const handlerMap = createScheduledJobHandlerMap({
            heartbeatHandler: executeSpy,
        });
        const processor = createScheduledCheckProcessor(handlerMap, jobRunRepo);

        await expect(
            processor({
                id: "job-2",
                name: HEARTBEAT_JOB_NAME,
                data: {},
            }),
        ).rejects.toThrow("database connection lost");

        expect(jobRunRepo.runs).toHaveLength(1);
        expect(jobRunRepo.runs[0]?.status).toBe("FAILED");
        expect(jobRunRepo.runs[0]?.error).toBe("database connection lost");
        expect(jobRunRepo.runs[0]?.finishedAt).toBeInstanceOf(Date);
    });

    it("registerSchedules registers the heartbeat recurring schedule with configured cron and timezone", async () => {
        const registered: RecurringJobRegistration[] = [];
        const fakeScheduler: Scheduler = {
            registerRecurringJob: async schedule => {
                registered.push(schedule);
            },
            enqueue: async () => {},
        };

        const schedulerConfig: SchedulerConfig = {
            TIMEZONE: "Asia/Jakarta",
            CRON: {
                HEARTBEAT: "* * * * *",
            },
        };

        await registerSchedules(fakeScheduler, schedulerConfig);

        expect(registered).toEqual([
            {
                id: HEARTBEAT_SCHEDULE_ID,
                jobName: HEARTBEAT_JOB_NAME,
                cronPattern: "* * * * *",
                timezone: "Asia/Jakarta",
            },
        ]);
    });
});
