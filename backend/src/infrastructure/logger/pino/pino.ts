import pino, { type DestinationStream, type Logger as PinoInstance } from "pino";
import { LOG_LEVELS, type LoggerConfig } from "../../../config/logger.js";
import {
    InvalidLoggerConfigError,
    LoggerFailureError,
    type LogContext,
    type Logger,
    type LogLevel,
} from "../../../shared/ports/logger/logger.js";

export const DEFAULT_REDACT_PATHS = [
    "req.headers.authorization",
    "req.headers.cookie",
    "headers.authorization",
    "headers.cookie",
    "*.password",
    "*.secret",
    "*.token",
    "*.apiKey",
    "*.accessToken",
    "*.refreshToken",
] as const;

export interface PinoLoggerOptions {
    /** Custom destination stream (defaults to stdout). Useful for testing or file streams. */
    readonly destination?: DestinationStream | undefined;
    /** Additional paths to redact from structured log objects. */
    readonly redactPaths?: readonly string[] | undefined;
}

const VALID_LEVELS = new Set<string>(LOG_LEVELS);

function normalizeLogContext(context: LogContext): Record<string, unknown> {
    if ("error" in context && !("err" in context) && context.error instanceof Error) {
        const { error, ...rest } = context;
        return { ...rest, err: error };
    }
    return { ...context };
}

export class PinoLogger implements Logger {
    private readonly instance: PinoInstance;

    constructor(config: LoggerConfig, options: PinoLoggerOptions = {}) {
        this.instance = PinoLogger.createPinoInstance(config, options);
    }

    private static createPinoInstance(config: LoggerConfig, options: PinoLoggerOptions): PinoInstance {
        const level = config.LEVEL?.trim();
        if (!level || !VALID_LEVELS.has(level)) {
            throw new InvalidLoggerConfigError(
                `Invalid LOG_LEVEL "${String(config.LEVEL)}". Must be one of: ${LOG_LEVELS.join(", ")}`,
            );
        }

        const serviceName = config.SERVICE_NAME?.trim();
        if (!serviceName) {
            throw new InvalidLoggerConfigError("LOG_SERVICE_NAME must not be empty");
        }

        const redactPaths = options.redactPaths
            ? [...new Set([...DEFAULT_REDACT_PATHS, ...options.redactPaths])]
            : [...DEFAULT_REDACT_PATHS];

        const destination =
            options.destination ??
            (config.FILE_PATH?.trim()
                ? pino.destination({
                      dest: config.FILE_PATH.trim(),
                      mkdir: true,
                      sync: true,
                  })
                : undefined);

        try {
            return pino(
                {
                    level,
                    base: { service: serviceName },
                    redact: {
                        paths: redactPaths,
                        censor: "[Redacted]",
                    },
                },
                destination,
            );
        } catch (cause) {
            throw new LoggerFailureError("initialize", cause);
        }
    }

    private static fromChildInstance(childInstance: PinoInstance): PinoLogger {
        const logger = Object.create(PinoLogger.prototype) as PinoLogger;
        Object.defineProperty(logger, "instance", {
            value: childInstance,
            writable: false,
            enumerable: false,
            configurable: false,
        });
        return logger;
    }

    /** Underlying Pino instance (useful for integrations such as `pino-http`). */
    get raw(): PinoInstance {
        return this.instance;
    }

    private writeLog(
        method: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
        contextOrMsg: LogContext | string,
        maybeMsg?: string,
    ): void {
        try {
            if (typeof contextOrMsg === "string") {
                this.instance[method](contextOrMsg);
            } else {
                const normalized = normalizeLogContext(contextOrMsg);
                this.instance[method](normalized, maybeMsg);
            }
        } catch (cause) {
            throw new LoggerFailureError(method, cause);
        }
    }

    fatal(msg: string): void;
    fatal(context: LogContext, msg: string): void;
    fatal(contextOrMsg: LogContext | string, maybeMsg?: string): void {
        this.writeLog("fatal", contextOrMsg, maybeMsg);
    }

    error(msg: string): void;
    error(context: LogContext, msg: string): void;
    error(contextOrMsg: LogContext | string, maybeMsg?: string): void {
        this.writeLog("error", contextOrMsg, maybeMsg);
    }

    warn(msg: string): void;
    warn(context: LogContext, msg: string): void;
    warn(contextOrMsg: LogContext | string, maybeMsg?: string): void {
        this.writeLog("warn", contextOrMsg, maybeMsg);
    }

    info(msg: string): void;
    info(context: LogContext, msg: string): void;
    info(contextOrMsg: LogContext | string, maybeMsg?: string): void {
        this.writeLog("info", contextOrMsg, maybeMsg);
    }

    debug(msg: string): void;
    debug(context: LogContext, msg: string): void;
    debug(contextOrMsg: LogContext | string, maybeMsg?: string): void {
        this.writeLog("debug", contextOrMsg, maybeMsg);
    }

    trace(msg: string): void;
    trace(context: LogContext, msg: string): void;
    trace(contextOrMsg: LogContext | string, maybeMsg?: string): void {
        this.writeLog("trace", contextOrMsg, maybeMsg);
    }

    child(bindings: LogContext): Logger {
        try {
            const childInstance = this.instance.child(normalizeLogContext(bindings));
            return PinoLogger.fromChildInstance(childInstance);
        } catch (cause) {
            throw new LoggerFailureError("child", cause);
        }
    }

    isLevelEnabled(level: Exclude<LogLevel, "silent">): boolean {
        return this.instance.isLevelEnabled(level);
    }
}

