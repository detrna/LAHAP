import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import type { LoggerConfig } from "../../../config/logger.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    InvalidLoggerConfigError,
    type LogLevel,
} from "../../../shared/ports/logger/logger.js";
import { PinoLogger } from "./pino.js";

function createCaptureStream() {
    const lines: Record<string, unknown>[] = [];
    const destination = new Writable({
        write(chunk: Buffer, _encoding, callback) {
            const text = chunk.toString("utf8").trim();
            if (text) {
                for (const line of text.split("\n")) {
                    lines.push(JSON.parse(line) as Record<string, unknown>);
                }
            }
            callback();
        },
    });

    return { destination, lines };
}

const defaultConfig: LoggerConfig = {
    LEVEL: "trace",
    SERVICE_NAME: "gtnic-test-service",
    FILE_PATH: "log/log.txt",
};

describe("PinoLogger (unit)", () => {
    describe("configuration validation", () => {
        it("throws InvalidLoggerConfigError when LEVEL is invalid", () => {
            expect(
                () =>
                    new PinoLogger({
                        LEVEL: "invalid-level" as LogLevel,
                        SERVICE_NAME: "gtnic-api",
                        FILE_PATH: "log/log.txt",
                    }),
            ).toThrow(InvalidLoggerConfigError);
        });

        it("throws InvalidLoggerConfigError (AppError 400) when SERVICE_NAME is empty", () => {
            try {
                new PinoLogger({
                    LEVEL: "info",
                    SERVICE_NAME: "   ",
                    FILE_PATH: "log/log.txt",
                });
                expect.fail("Should have thrown InvalidLoggerConfigError");
            } catch (err) {
                expect(err).toBeInstanceOf(InvalidLoggerConfigError);
                expect(err).toBeInstanceOf(AppError);
                const appErr = err as InvalidLoggerConfigError;
                expect(appErr.code).toBe("INVALID_LOGGER_CONFIG");
                expect(appErr.statusCode).toBe(400);
            }
        });
    });

    describe("log levels and structured JSON output", () => {
        it("writes structured JSON lines for trace, debug, info, warn, error, and fatal", () => {
            const { destination, lines } = createCaptureStream();
            const logger = new PinoLogger(defaultConfig, { destination });

            logger.trace("trace msg");
            logger.debug({ step: 1 }, "debug msg");
            logger.info({ userId: "u-1" }, "info msg");
            logger.warn("warn msg");
            logger.error({ code: "E_FAIL" }, "error msg");
            logger.fatal("fatal msg");

            expect(lines).toHaveLength(6);
            expect(lines[0]).toMatchObject({
                level: 10,
                service: "gtnic-test-service",
                msg: "trace msg",
            });
            expect(lines[1]).toMatchObject({
                level: 20,
                step: 1,
                msg: "debug msg",
            });
            expect(lines[2]).toMatchObject({
                level: 30,
                userId: "u-1",
                msg: "info msg",
            });
            expect(lines[3]).toMatchObject({
                level: 40,
                msg: "warn msg",
            });
            expect(lines[4]).toMatchObject({
                level: 50,
                code: "E_FAIL",
                msg: "error msg",
            });
            expect(lines[5]).toMatchObject({
                level: 60,
                msg: "fatal msg",
            });
        });

        it("respects the configured log level and filters lower-priority logs", () => {
            const { destination, lines } = createCaptureStream();
            const logger = new PinoLogger(
                { LEVEL: "warn", SERVICE_NAME: "gtnic-api", FILE_PATH: "log/log.txt" },
                { destination },
            );

            expect(logger.isLevelEnabled("debug")).toBe(false);
            expect(logger.isLevelEnabled("info")).toBe(false);
            expect(logger.isLevelEnabled("warn")).toBe(true);
            expect(logger.isLevelEnabled("error")).toBe(true);

            logger.debug("ignored debug");
            logger.info("ignored info");
            logger.warn("logged warn");
            logger.error("logged error");

            expect(lines).toHaveLength(2);
            expect(lines.map(l => l.msg)).toEqual(["logged warn", "logged error"]);
        });

        it("produces no output when level is silent", () => {
            const { destination, lines } = createCaptureStream();
            const logger = new PinoLogger(
                { LEVEL: "silent", SERVICE_NAME: "gtnic-api", FILE_PATH: "log/log.txt" },
                { destination },
            );

            logger.info("should not print");
            logger.error("should not print");
            logger.fatal("should not print");

            expect(lines).toHaveLength(0);
        });
    });

    describe("error serialization", () => {
        it("serializes Error instances passed under 'err' or 'error' with message and stack", () => {
            const { destination, lines } = createCaptureStream();
            const logger = new PinoLogger(defaultConfig, { destination });

            const sampleErr = new Error("Database connection timeout");
            logger.error({ err: sampleErr, retryAttempt: 2 }, "Query failed");
            logger.error({ error: sampleErr, job: "sync" }, "Sync failed");

            expect(lines).toHaveLength(2);
            expect(lines[0]).toMatchObject({
                msg: "Query failed",
                retryAttempt: 2,
                err: expect.objectContaining({
                    type: "Error",
                    message: "Database connection timeout",
                    stack: expect.stringContaining("Database connection timeout"),
                }),
            });
            expect(lines[1]).toMatchObject({
                msg: "Sync failed",
                job: "sync",
                err: expect.objectContaining({
                    type: "Error",
                    message: "Database connection timeout",
                }),
            });
        });
    });

    describe("secret redaction", () => {
        it("redacts sensitive headers and fields by default and supports custom redactPaths", () => {
            const { destination, lines } = createCaptureStream();
            const logger = new PinoLogger(defaultConfig, {
                destination,
                redactPaths: ["payment.cardNumber"],
            });

            logger.info(
                {
                    req: {
                        headers: {
                            authorization: "Bearer super-secret-jwt",
                            cookie: "sid=secret-cookie",
                        },
                    },
                    user: {
                        email: "user@example.com",
                        password: "plain-text-password",
                        accessToken: "jwt-access",
                        refreshToken: "jwt-refresh",
                    },
                    payment: {
                        cardNumber: "4111-2222-3333-4444",
                    },
                },
                "Incoming request",
            );

            expect(lines).toHaveLength(1);
            const entry = lines[0]!;
            expect(entry.req).toEqual({
                headers: {
                    authorization: "[Redacted]",
                    cookie: "[Redacted]",
                },
            });
            expect(entry.user).toEqual({
                email: "user@example.com",
                password: "[Redacted]",
                accessToken: "[Redacted]",
                refreshToken: "[Redacted]",
            });
            expect(entry.payment).toEqual({
                cardNumber: "[Redacted]",
            });
        });
    });

    describe("child loggers", () => {
        it("creates child loggers that attach bound context to all subsequent logs", () => {
            const { destination, lines } = createCaptureStream();
            const rootLogger = new PinoLogger(defaultConfig, { destination });

            const requestLogger = rootLogger.child({ requestId: "req-101", path: "/api/orders" });
            requestLogger.info("Request started");
            requestLogger.info({ statusCode: 200 }, "Request completed");

            expect(lines).toHaveLength(2);
            expect(lines[0]).toMatchObject({
                service: "gtnic-test-service",
                requestId: "req-101",
                path: "/api/orders",
                msg: "Request started",
            });
            expect(lines[1]).toMatchObject({
                service: "gtnic-test-service",
                requestId: "req-101",
                path: "/api/orders",
                statusCode: 200,
                msg: "Request completed",
            });
        });
    });

    describe("file destination output", () => {
        it("outputs logs to FILE_PATH and creates directories automatically", () => {
            const testFilePath = join("test-log-dir", "sub", "test-log.txt");

            try {
                const fileLogger = new PinoLogger({
                    LEVEL: "info",
                    SERVICE_NAME: "file-logger-test",
                    FILE_PATH: testFilePath,
                });

                fileLogger.info({ event: "boot" }, "Application started");

                expect(existsSync(testFilePath)).toBe(true);
                const fileContent = readFileSync(testFilePath, "utf8");
                expect(fileContent).toContain('"service":"file-logger-test"');
                expect(fileContent).toContain('"msg":"Application started"');
                expect(fileContent).toContain('"event":"boot"');
            } finally {
                rmSync("test-log-dir", { recursive: true, force: true });
            }
        });
    });
});

