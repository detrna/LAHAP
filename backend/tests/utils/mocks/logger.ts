import { vi } from "vitest";
import type { Logger } from "../../../src/shared/ports/logger/logger.js";

export type MockLogger = Logger & {
    fatal: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    trace: ReturnType<typeof vi.fn>;
    child: ReturnType<typeof vi.fn>;
};

export function createMockLogger(): MockLogger {
    const logger = {
        fatal: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        child: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
    };
    logger.child.mockReturnValue(logger);
    return logger as MockLogger;
}
