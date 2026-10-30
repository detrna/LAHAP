import { Queue, type JobSchedulerJson, type JobsOptions } from "bullmq";
import type { Redis } from "ioredis";
import {
    InvalidScheduleError,
    SchedulerFailureError,
    type EnqueueJobOptions,
    type RecurringJobRegistration,
    type Scheduler,
} from "../../../shared/ports/scheduler/scheduler.js";

export const SCHEDULED_CHECKS_QUEUE_NAME = "scheduled-checks";

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 1_000,
    },
    removeOnComplete: {
        age: 24 * 60 * 60, // 24 hours in seconds
        count: 1_000,
    },
    removeOnFail: {
        age: 7 * 24 * 60 * 60, // 7 days in seconds
        count: 5_000,
    },
};

export interface BullMqQueues {
    readonly scheduledChecksQueue: Queue<Record<string, unknown>, unknown, string>;
    closeAll(): Promise<void>;
}

export const createQueues = (connection: Redis): BullMqQueues => {
    const scheduledChecksQueue = new Queue<Record<string, unknown>, unknown, string>(SCHEDULED_CHECKS_QUEUE_NAME, {
        connection,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    return {
        scheduledChecksQueue,
        async closeAll(): Promise<void> {
            await scheduledChecksQueue.close();
        },
    };
};

export class BullMqScheduler implements Scheduler {
    private readonly queuesByName: ReadonlyMap<string, Queue<Record<string, unknown>, unknown, string>>;

    constructor(private readonly queues: BullMqQueues) {
        this.queuesByName = new Map<string, Queue<Record<string, unknown>, unknown, string>>([
            [SCHEDULED_CHECKS_QUEUE_NAME, queues.scheduledChecksQueue],
        ]);
    }

    async registerRecurringJob(schedule: RecurringJobRegistration): Promise<void> {
        const id = schedule.id.trim();
        const jobName = schedule.jobName.trim();
        const cronPattern = schedule.cronPattern.trim();
        const timezone = schedule.timezone.trim();

        if (!id || !jobName || !cronPattern || !timezone) {
            throw new InvalidScheduleError(
                schedule.id,
                "schedule id, jobName, cronPattern, and timezone must all be non-empty",
            );
        }

        try {
            await this.queues.scheduledChecksQueue.upsertJobScheduler(
                id,
                {
                    pattern: cronPattern,
                    tz: timezone,
                },
                {
                    name: jobName,
                    data: schedule.data ?? {},
                },
            );
        } catch (error) {
            throw new SchedulerFailureError(`registerRecurringJob(${id})`, error);
        }
    }

    async enqueue<TData extends Record<string, unknown> = Record<string, unknown>>(
        queueName: string,
        jobName: string,
        data: TData,
        options?: EnqueueJobOptions,
    ): Promise<void> {
        const queue = this.queuesByName.get(queueName);
        if (!queue) {
            throw new SchedulerFailureError(`unknown queue "${queueName}"`);
        }

        const jobOptions: JobsOptions = {};
        if (options?.jobId !== undefined) {
            jobOptions.jobId = options.jobId;
        }
        if (options?.delayMs !== undefined) {
            jobOptions.delay = options.delayMs;
        }
        if (options?.attempts !== undefined) {
            jobOptions.attempts = options.attempts;
        }

        try {
            await queue.add(jobName, data, jobOptions);
        } catch (error) {
            throw new SchedulerFailureError(`enqueue(${queueName}:${jobName})`, error);
        }
    }

    async listScheduledCheckSchedulers(): Promise<JobSchedulerJson<Record<string, unknown>>[]> {
        return this.queues.scheduledChecksQueue.getJobSchedulers();
    }
}
