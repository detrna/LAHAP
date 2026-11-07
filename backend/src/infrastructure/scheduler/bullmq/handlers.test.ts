import { describe, expect, it, vi } from "vitest";
import type { SchedulerConfig } from "../../../config/scheduler.js";
import {
    JobRunNotFoundError,
    type JobRunRecord,
    type JobRunRepository,
} from "../../../shared/ports/job-run-repository/job-run-repository.js";
import type { RecurringJobRegistration, Scheduler } from "../../../shared/ports/scheduler/scheduler.js";
import { createScheduledCheckProcessor, createScheduledJobHandlerMap, defaultHeartbeatHandler } from "./handlers.js";
import {
    EXPIRE_PENDING_PAYMENTS_JOB_NAME,
    EXPIRE_PENDING_PAYMENTS_SCHEDULE_ID,
    HEARTBEAT_JOB_NAME,
    HEARTBEAT_SCHEDULE_ID,
    PREPARE_DUE_SLOTS_JOB_NAME,
    PREPARE_DUE_SLOTS_SCHEDULE_ID,
    REMIND_EMPTY_SCHEDULES_JOB_NAME,
    REMIND_EMPTY_SCHEDULES_SCHEDULE_ID,
    registerSchedules,
} from "./register-schedules.js";

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
                EXPIRE_PENDING_PAYMENTS: "*/2 * * * *",
                PREPARE_DUE_SLOTS: "*/15 * * * *",
                REMIND_EMPTY_SCHEDULES: "0 9 * * *",
            },
            SLOT_PREPARATION_LEAD_MINUTES: 180,
        };

        await registerSchedules(fakeScheduler, schedulerConfig);

        expect(registered).toEqual([
            {
                id: HEARTBEAT_SCHEDULE_ID,
                jobName: HEARTBEAT_JOB_NAME,
                cronPattern: "* * * * *",
                timezone: "Asia/Jakarta",
            },
            {
                id: EXPIRE_PENDING_PAYMENTS_SCHEDULE_ID,
                jobName: EXPIRE_PENDING_PAYMENTS_JOB_NAME,
                cronPattern: "*/2 * * * *",
                timezone: "Asia/Jakarta",
            },
            {
                id: PREPARE_DUE_SLOTS_SCHEDULE_ID,
                jobName: PREPARE_DUE_SLOTS_JOB_NAME,
                cronPattern: "*/15 * * * *",
                timezone: "Asia/Jakarta",
            },
            {
                id: REMIND_EMPTY_SCHEDULES_SCHEDULE_ID,
                jobName: REMIND_EMPTY_SCHEDULES_JOB_NAME,
                cronPattern: "0 9 * * *",
                timezone: "Asia/Jakarta",
            },
        ]);
    });

    it("runs the expiry use case for the expire-pending-payments job", async () => {
        const expirePendingPayments = vi.fn().mockResolvedValue({ expiredCount: 2 });
        const jobRunRepo = new InMemoryJobRunRepository();
        const processor = createScheduledCheckProcessor(
            createScheduledJobHandlerMap({ expirePendingPayments }),
            jobRunRepo,
        );

        await processor({ id: "job-3", name: EXPIRE_PENDING_PAYMENTS_JOB_NAME, data: {} });

        expect(expirePendingPayments).toHaveBeenCalledTimes(1);
        expect(jobRunRepo.runs[0]?.status).toBe("SUCCESS");
    });

    it("runs the preparation use case for the prepare-due-slots job", async () => {
        const prepareDueSlots = vi.fn().mockResolvedValue({ preparedCount: 3 });
        const jobRunRepo = new InMemoryJobRunRepository();
        const processor = createScheduledCheckProcessor(createScheduledJobHandlerMap({ prepareDueSlots }), jobRunRepo);

        await processor({ id: "job-4", name: PREPARE_DUE_SLOTS_JOB_NAME, data: {} });

        expect(prepareDueSlots).toHaveBeenCalledTimes(1);
    });

    it("runs the reminder use case for the remind-empty-schedules job", async () => {
        const remindEmptySchedules = vi.fn().mockResolvedValue({ emptyPackageIds: ["p-1"] });
        const jobRunRepo = new InMemoryJobRunRepository();
        const processor = createScheduledCheckProcessor(
            createScheduledJobHandlerMap({ remindEmptySchedules }),
            jobRunRepo,
        );

        await processor({ id: "job-5", name: REMIND_EMPTY_SCHEDULES_JOB_NAME, data: {} });

        expect(remindEmptySchedules).toHaveBeenCalledTimes(1);
        expect(jobRunRepo.runs[0]?.status).toBe("SUCCESS");
    });

    it("has no expiry handler unless the use case is given", () => {
        expect(createScheduledJobHandlerMap()[EXPIRE_PENDING_PAYMENTS_JOB_NAME]).toBeUndefined();
    });

    it("has no reminder handler unless the use case is given", () => {
        expect(createScheduledJobHandlerMap()[REMIND_EMPTY_SCHEDULES_JOB_NAME]).toBeUndefined();
    });
});
