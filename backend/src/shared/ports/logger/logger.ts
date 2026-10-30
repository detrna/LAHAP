export * from "./errors.js";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
    /** Logs a fatal error message. */
    fatal(msg: string): void;
    fatal(context: LogContext, msg: string): void;

    /** Logs an error message. Pass Error instances under the `err` key in `context`. */
    error(msg: string): void;
    error(context: LogContext, msg: string): void;

    /** Logs a warning message. */
    warn(msg: string): void;
    warn(context: LogContext, msg: string): void;

    /** Logs an informational business/lifecycle event. */
    info(msg: string): void;
    info(context: LogContext, msg: string): void;

    /** Logs a debug message for development detail. */
    debug(msg: string): void;
    debug(context: LogContext, msg: string): void;

    /** Logs a verbose trace message. */
    trace(msg: string): void;
    trace(context: LogContext, msg: string): void;

    /** Creates a child logger with bound context properties included on every log line. */
    child(bindings: LogContext): Logger;

    /** Returns true if the given level is enabled and will be written. */
    isLevelEnabled(level: Exclude<LogLevel, "silent">): boolean;
}

