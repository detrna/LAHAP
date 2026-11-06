import { vi } from "vitest";
import type { EventBus } from "../../../../shared/ports/event-bus/event-bus.js";
import type { Connection } from "../../service/connection-hub.js";
import type { RealtimeService } from "../../service/realtime.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedEventBus = Mocked<EventBus>;

export type MockedRealtimeService = Mocked<Pick<RealtimeService, "connect" | "disconnect" | "getMillisecondsUntil">>;

export interface MockedConnection extends Connection {
    readonly send: Connection["send"] & ReturnType<typeof vi.fn>;
    readonly close: Connection["close"] & ReturnType<typeof vi.fn>;
}

export function createMockEventBus(): MockedEventBus {
    return {
        publish: vi.fn(async () => undefined),
        subscribe: vi.fn(async () => async () => undefined),
        close: vi.fn(async () => undefined),
    } as MockedEventBus;
}

export function createMockRealtimeService(): MockedRealtimeService {
    return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getMillisecondsUntil: vi.fn(() => 3_600_000),
    } as MockedRealtimeService;
}

let counter = 0;

export function createMockConnection(overrides: Partial<Connection> = {}): MockedConnection {
    counter += 1;
    return {
        id: `connection-${counter}`,
        userId: "user-1",
        role: "CUSTOMER",
        send: vi.fn(),
        bufferedBytes: vi.fn(() => 0),
        close: vi.fn(),
        ...overrides,
    } as MockedConnection;
}
