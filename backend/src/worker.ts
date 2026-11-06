import { z } from "zod";
import { loadConfig } from "./config/index.js";
import { DEFAULT_LOGGER_CONFIG } from "./config/logger.js";
import { loadDatabase } from "./infrastructure/database/prisma/db.js";
import { createAdapters } from "./infrastructure/index.js";
import { PrismaJobRunRepository } from "./infrastructure/database/prisma/job-run-repository.js";
import { PinoLogger } from "./infrastructure/logger/pino/pino.js";
import { createBullMqConnection } from "./infrastructure/scheduler/bullmq/connection.js";
import {
    BullMqScheduler,
    createQueues,
    SCHEDULED_CHECKS_QUEUE_NAME,
} from "./infrastructure/scheduler/bullmq/queues.js";
import {
    HEARTBEAT_JOB_NAME,
    PREPARE_DUE_SLOTS_JOB_NAME,
    registerSchedules,
} from "./infrastructure/scheduler/bullmq/register-schedules.js";
import { startWorkers } from "./infrastructure/scheduler/bullmq/worker.js";
import { createModules } from "./modules/create-modules.js";
import type { Logger } from "./shared/ports/logger/logger.js";

/**
 * Worker Entry Point (`src/worker.ts`)
 *
 * Usage:
 * - Start worker & schedules: `npm run worker` (or `npm run dev:worker`)
 * - Manually trigger an immediate heartbeat job: `npm run worker -- --trigger-heartbeat`
 */
async function bootstrapWorker(): Promise<void> {
    let logger: Logger = new PinoLogger({
        ...DEFAULT_LOGGER_CONFIG,
        SERVICE_NAME: "gtnic-worker",
    });

    try {
        const config = loadConfig();
        logger = new PinoLogger({
            ...config.LOGGER,
            SERVICE_NAME: `${config.LOGGER.SERVICE_NAME}-worker`,
        });

        const isManualTrigger = process.argv.includes("--trigger-heartbeat");

        const queueConnection = createBullMqConnection(config.REDIS);
        const queues = createQueues(queueConnection);
        const scheduler = new BullMqScheduler(queues);

        if (isManualTrigger) {
            await scheduler.enqueue(SCHEDULED_CHECKS_QUEUE_NAME, HEARTBEAT_JOB_NAME, {
                manualTrigger: true,
                requestedAt: new Date().toISOString(),
            });
            logger.info(`[Worker] Manually enqueued "${HEARTBEAT_JOB_NAME}" on queue "${SCHEDULED_CHECKS_QUEUE_NAME}"`);
            await queues.closeAll();
            await queueConnection.quit();
            return;
        }

        const [loadedAdapters, db] = await Promise.all([createAdapters(config), loadDatabase(config.DATABASE)]);
        const adapters = { ...loadedAdapters, logger };
        logger.info("[Worker] Adapters and database connected successfully");
        const { orders } = createModules({ db, adapters, http: config.HTTP });

        const jobRunRepository = new PrismaJobRunRepository(db);

        await registerSchedules(scheduler, config.SCHEDULER);
        const activeSchedulers = await scheduler.listScheduledCheckSchedulers();
        logger.info(
            {
                schedulers: activeSchedulers.map(s => ({
                    key: s.key,
                    name: s.name,
                    pattern: s.pattern,
                    tz: s.tz,
                    next: s.next,
                })),
            },
            `[Worker] Registered ${activeSchedulers.length} job scheduler(s)`,
        );

        const workers = startWorkers({
            redisConfig: config.REDIS,
            jobRunRepository,
            logger,
            handlers: {
                expirePendingPayments: () => orders.service.expirePendingPayments(),
                prepareDueSlots: () => orders.service.prepareDueSlots(config.SCHEDULER.SLOT_PREPARATION_LEAD_MINUTES),
            },
        });

        logger.info(`[Worker] Worker started for queue "${SCHEDULED_CHECKS_QUEUE_NAME}"`);
        await scheduler.enqueue(SCHEDULED_CHECKS_QUEUE_NAME, PREPARE_DUE_SLOTS_JOB_NAME, { catchUp: true });

        let isShuttingDown = false;
        const shutdown = async (signal: string) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;
            logger.info(`[Worker] Received ${signal}, shutting down gracefully...`);

            try {
                await workers.closeAll();
                await queues.closeAll();
                await queueConnection.quit();
                await Promise.all([db.close(), adapters.cache.close(), adapters.eventBus.close()]);
                logger.info("[Worker] Graceful shutdown complete");
                process.exit(0);
            } catch (shutdownErr) {
                logger.error({ err: shutdownErr }, "[Worker] Error during shutdown");
                process.exit(1);
            }
        };

        process.on("SIGINT", () => {
            void shutdown("SIGINT");
        });
        process.on("SIGTERM", () => {
            void shutdown("SIGTERM");
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.error({ issues: err.issues }, "[Worker] Invalid configuration:");
            for (const issue of err.issues) {
                logger.error(
                    { path: issue.path.join("."), issue: issue.message },
                    `  ${issue.path.join(".")}: ${issue.message}`,
                );
            }
        } else {
            logger.error({ err }, "[Worker] Startup failed");
        }
        process.exit(1);
    }
}

void bootstrapWorker();
