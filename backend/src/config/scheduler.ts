import { z } from "zod";

export interface SchedulerCronConfig {
    readonly HEARTBEAT: string;
    // Placeholders for future scheduled business checks (e.g. missing menu, churn detection)
}

export interface SchedulerConfig {
    readonly TIMEZONE: string;
    readonly CRON: SchedulerCronConfig;
}

export const schedulerEnvSchema = z.object({
    SCHEDULER_TIMEZONE: z.string().min(1).default("Asia/Jakarta"),
    SCHEDULER_HEARTBEAT_CRON: z.string().min(1).default("* * * * *"),
});

export type SchedulerEnv = z.output<typeof schedulerEnvSchema>;

export const toSchedulerConfig = (env: SchedulerEnv): SchedulerConfig => ({
    TIMEZONE: env.SCHEDULER_TIMEZONE,
    CRON: {
        HEARTBEAT: env.SCHEDULER_HEARTBEAT_CRON,
    },
});

export const loadSchedulerConfig = (env: NodeJS.ProcessEnv = process.env): SchedulerConfig =>
    toSchedulerConfig(schedulerEnvSchema.parse(env));
