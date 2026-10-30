import { z } from "zod";
import { loadConfig } from "./config/index.js";
import { loadDatabase } from "./infrastructure/database/prisma/db.js";
import { PrismaJobRunRepository } from "./infrastructure/database/prisma/job-run-repository.js";
import { createBullMqConnection } from "./infrastructure/scheduler/bullmq/connection.js";
import {
    BullMqScheduler,
    createQueues,
    SCHEDULED_CHECKS_QUEUE_NAME,
} from "./infrastructure/scheduler/bullmq/queues.js";
import { HEARTBEAT_JOB_NAME, registerSchedules } from "./infrastructure/scheduler/bullmq/register-schedules.js";
import { startWorkers } from "./infrastructure/scheduler/bullmq/worker.js";

/**
 * Worker Entry Point (`src/worker.ts`)
 *
 * Usage:
 * - Start worker & schedules: `npm run worker` (or `npm run dev:worker`)
 * - Manually trigger an immediate heartbeat job: `npm run worker -- --trigger-heartbeat`
 */
async function bootstrapWorker(): Promise<void> {
    try {
        const config = loadConfig();
        const isManualTrigger = process.argv.includes("--trigger-heartbeat");

        const queueConnection = createBullMqConnection(config.REDIS);
        const queues = createQueues(queueConnection);
        const scheduler = new BullMqScheduler(queues);

        if (isManualTrigger) {
            await scheduler.enqueue(SCHEDULED_CHECKS_QUEUE_NAME, HEARTBEAT_JOB_NAME, {
                manualTrigger: true,
                requestedAt: new Date().toISOString(),
            });
            console.log(`[Worker] Manually enqueued "${HEARTBEAT_JOB_NAME}" on queue "${SCHEDULED_CHECKS_QUEUE_NAME}"`);
            await queues.closeAll();
            await queueConnection.quit();
            return;
        }

        const db = await loadDatabase(config.DATABASE);
        console.log("[Worker] Database connected successfully");

        const jobRunRepository = new PrismaJobRunRepository(db);

        await registerSchedules(scheduler, config.SCHEDULER);
        const activeSchedulers = await scheduler.listScheduledCheckSchedulers();
        console.log(
            `[Worker] Registered ${activeSchedulers.length} job scheduler(s):`,
            JSON.stringify(
                activeSchedulers.map(s => ({
                    key: s.key,
                    name: s.name,
                    pattern: s.pattern,
                    tz: s.tz,
                    next: s.next,
                })),
            ),
        );

        const workers = startWorkers({
            redisConfig: config.REDIS,
            jobRunRepository,
        });

        console.log(`[Worker] Worker started for queue "${SCHEDULED_CHECKS_QUEUE_NAME}"`);

        let isShuttingDown = false;
        const shutdown = async (signal: string) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;
            console.log(`[Worker] Received ${signal}, shutting down gracefully...`);

            try {
                await workers.closeAll();
                await queues.closeAll();
                await queueConnection.quit();
                await db.close();
                console.log("[Worker] Graceful shutdown complete");
                process.exit(0);
            } catch (shutdownErr) {
                console.error("[Worker] Error during shutdown:", shutdownErr);
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
            console.error("[Worker] Invalid configuration:");
            for (const issue of err.issues) {
                console.error(`  ${issue.path.join(".")}: ${issue.message}`);
            }
        } else {
            console.error("[Worker] Startup failed:", err);
        }
        process.exit(1);
    }
}

void bootstrapWorker();
