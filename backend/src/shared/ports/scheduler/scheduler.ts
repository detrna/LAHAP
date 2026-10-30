export * from "./errors.js";

export interface RecurringJobRegistration {
    readonly id: string;
    readonly jobName: string;
    readonly cronPattern: string;
    readonly timezone: string;
    readonly data?: Record<string, unknown> | undefined;
}

export interface EnqueueJobOptions {
    readonly jobId?: string | undefined;
    readonly delayMs?: number | undefined;
    readonly attempts?: number | undefined;
}

export interface Scheduler {
    /**
     * Idempotently registers or updates a recurring job schedule.
     */
    registerRecurringJob(schedule: RecurringJobRegistration): Promise<void>;

    /**
     * Enqueues a one-off job to a named queue.
     */
    enqueue<TData extends Record<string, unknown> = Record<string, unknown>>(
        queueName: string,
        jobName: string,
        data: TData,
        options?: EnqueueJobOptions,
    ): Promise<void>;
}
