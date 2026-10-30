import { z } from "zod";
import type { LogLevel } from "../shared/ports/logger/logger.js";

export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

export interface LoggerConfig {
    readonly LEVEL: LogLevel;
    readonly SERVICE_NAME: string;
    readonly FILE_PATH?: string;
}

export const loggerEnvSchema = z.object({
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
    LOG_SERVICE_NAME: z.string().trim().min(1).default("gtnic-backend"),
    LOG_FILE_PATH: z.string().trim().min(1).default("log/log.txt"),
});

export type LoggerEnv = z.output<typeof loggerEnvSchema>;

export const toLoggerConfig = (env: LoggerEnv): LoggerConfig => ({
    LEVEL: env.LOG_LEVEL,
    SERVICE_NAME: env.LOG_SERVICE_NAME,
    FILE_PATH: env.LOG_FILE_PATH,
});

export const loadLoggerConfig = (env: NodeJS.ProcessEnv = process.env): LoggerConfig =>
    toLoggerConfig(loggerEnvSchema.parse(env));
