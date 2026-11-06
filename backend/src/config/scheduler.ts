import { z } from "zod";

export interface SchedulerCronConfig {
    readonly HEARTBEAT: string;
    readonly EXPIRE_PENDING_PAYMENTS: string;
    readonly PREPARE_DUE_SLOTS: string;
}

export interface SchedulerConfig {
    readonly TIMEZONE: string;
    readonly CRON: SchedulerCronConfig;
    readonly SLOT_PREPARATION_LEAD_MINUTES: number;
}

export const schedulerEnvSchema = z.object({
    SCHEDULER_TIMEZONE: z.string().min(1).default("Asia/Jakarta"),
    SCHEDULER_HEARTBEAT_CRON: z.string().min(1).default("* * * * *"),
    SCHEDULER_EXPIRE_PENDING_PAYMENTS_CRON: z.string().min(1).default("* * * * *"),
    SCHEDULER_PREPARE_DUE_SLOTS_CRON: z.string().min(1).default("*/15 * * * *"),
    SLOT_PREPARATION_LEAD_MINUTES: z.coerce.number().int().min(0).max(1440).default(180),
});

export type SchedulerEnv = z.output<typeof schedulerEnvSchema>;

export const toSchedulerConfig = (env: SchedulerEnv): SchedulerConfig => ({
    TIMEZONE: env.SCHEDULER_TIMEZONE,
    CRON: {
        HEARTBEAT: env.SCHEDULER_HEARTBEAT_CRON,
        EXPIRE_PENDING_PAYMENTS: env.SCHEDULER_EXPIRE_PENDING_PAYMENTS_CRON,
        PREPARE_DUE_SLOTS: env.SCHEDULER_PREPARE_DUE_SLOTS_CRON,
    },
    SLOT_PREPARATION_LEAD_MINUTES: env.SLOT_PREPARATION_LEAD_MINUTES,
});

export const loadSchedulerConfig = (env: NodeJS.ProcessEnv = process.env): SchedulerConfig =>
    toSchedulerConfig(schedulerEnvSchema.parse(env));
