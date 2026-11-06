import type { SchedulerConfig } from "../../../config/scheduler.js";
import type { RecurringJobRegistration, Scheduler } from "../../../shared/ports/scheduler/scheduler.js";

export const HEARTBEAT_SCHEDULE_ID = "heartbeat-schedule";
export const HEARTBEAT_JOB_NAME = "heartbeat";
export const EXPIRE_PENDING_PAYMENTS_SCHEDULE_ID = "expire-pending-payments-schedule";
export const EXPIRE_PENDING_PAYMENTS_JOB_NAME = "expire-pending-payments";
export const PREPARE_DUE_SLOTS_SCHEDULE_ID = "prepare-due-slots-schedule";
export const PREPARE_DUE_SLOTS_JOB_NAME = "prepare-due-slots";

/**
 * Builds the declarative list of recurring schedule definitions.
 *
 * Adding a real scheduled check later requires appending one entry here
 * (plus its use case in its owning module and one entry in the handler map).
 */
export const buildScheduleDefinitions = (schedulerConfig: SchedulerConfig): readonly RecurringJobRegistration[] => [
    // TEMPORARY: Placeholder heartbeat job to prove the pipeline end-to-end
    {
        id: HEARTBEAT_SCHEDULE_ID,
        jobName: HEARTBEAT_JOB_NAME,
        cronPattern: schedulerConfig.CRON.HEARTBEAT,
        timezone: schedulerConfig.TIMEZONE,
    },
    {
        id: EXPIRE_PENDING_PAYMENTS_SCHEDULE_ID,
        jobName: EXPIRE_PENDING_PAYMENTS_JOB_NAME,
        cronPattern: schedulerConfig.CRON.EXPIRE_PENDING_PAYMENTS,
        timezone: schedulerConfig.TIMEZONE,
    },
    {
        id: PREPARE_DUE_SLOTS_SCHEDULE_ID,
        jobName: PREPARE_DUE_SLOTS_JOB_NAME,
        cronPattern: schedulerConfig.CRON.PREPARE_DUE_SLOTS,
        timezone: schedulerConfig.TIMEZONE,
    },
];

/**
 * Idempotently registers all recurring schedules at worker startup using
 * the Scheduler port (backed by BullMQ's `upsertJobScheduler`).
 */
export const registerSchedules = async (
    scheduler: Scheduler,
    schedulerConfig: SchedulerConfig,
): Promise<readonly RecurringJobRegistration[]> => {
    const definitions = buildScheduleDefinitions(schedulerConfig);

    for (const definition of definitions) {
        await scheduler.registerRecurringJob(definition);
    }

    return definitions;
};
