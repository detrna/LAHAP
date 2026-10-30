import { Worker } from "bullmq";
import type { RedisConfig } from "../../config/redis.js";
import type { JobRunRepository } from "../../shared/ports/job-run-repository/job-run-repository.js";
import { createBullMqConnection } from "./connection.js";
import {
    createScheduledCheckProcessor,
    createScheduledJobHandlerMap,
    type HandlerDependencies,
} from "./handlers.js";
import { SCHEDULED_CHECKS_QUEUE_NAME } from "./queues.js";

export interface StartWorkersDependencies {
    readonly redisConfig: RedisConfig;
    readonly jobRunRepository: JobRunRepository;
    readonly handlers?: HandlerDependencies | undefined;
}

export interface RunningWorkers {
    readonly scheduledChecksWorker: Worker<Record<string, unknown>, void, string>;
    closeAll(): Promise<void>;
}

/**
 * Starts the BullMQ worker for the "scheduled-checks" queue.
 * Dispatches recurring and manually triggered check jobs via the handler map.
 *
 * Uses its own dedicated ioredis connection with `maxRetriesPerRequest: null`.
 */
export const startWorkers = (deps: StartWorkersDependencies): RunningWorkers => {
    const scheduledChecksConnection = createBullMqConnection(deps.redisConfig);

    const handlerMap = createScheduledJobHandlerMap(deps.handlers);

    const scheduledCheckProcessor = createScheduledCheckProcessor(
        handlerMap,
        deps.jobRunRepository,
    );

    const scheduledChecksWorker = new Worker<Record<string, unknown>, void, string>(
        SCHEDULED_CHECKS_QUEUE_NAME,
        async (job) => {
            await scheduledCheckProcessor({
                id: job.id,
                name: job.name,
                data: job.data ?? {},
            });
        },
        {
            connection: scheduledChecksConnection,
        },
    );

    scheduledChecksWorker.on("error", (err) => {
        console.error(`[Worker:${SCHEDULED_CHECKS_QUEUE_NAME}] Error:`, err);
    });

    return {
        scheduledChecksWorker,
        async closeAll(): Promise<void> {
            await scheduledChecksWorker.close();
            await scheduledChecksConnection.quit();
        },
    };
};
