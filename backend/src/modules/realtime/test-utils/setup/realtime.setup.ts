import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { createMockLogger } from "../../../../../tests/utils/mocks/logger.js";
import type { Logger } from "../../../../shared/ports/logger/logger.js";
import type { EventBus } from "../../../../shared/ports/event-bus/event-bus.js";
import { RealtimeController } from "../../controller/realtime.controller.js";
import { ConnectionHub, type ConnectionHubLimits } from "../../service/connection-hub.js";
import { RealtimeService } from "../../service/realtime.service.js";
import {
    createMockEventBus,
    createMockRealtimeService,
    type MockedEventBus,
    type MockedRealtimeService,
} from "../mocks/realtime.mocks.js";

export const DEFAULT_LIMITS: ConnectionHubLimits = { maxPerUser: 5, maxTotal: 1000, maxBufferedBytes: 1024 * 1024 };

export interface RealtimeServiceSetup {
    readonly eventBus: MockedEventBus;
    readonly hub: ConnectionHub;
    readonly logger: ReturnType<typeof createMockLogger>;
    readonly clock: FixedClock;
    readonly service: RealtimeService;
}

export interface RealtimeControllerSetup {
    readonly realtimeService: MockedRealtimeService;
    readonly controller: RealtimeController;
}

export function setupRealtimeService(limits: ConnectionHubLimits = DEFAULT_LIMITS): RealtimeServiceSetup {
    const eventBus = createMockEventBus();
    const hub = new ConnectionHub(limits);
    const logger = createMockLogger();
    const clock = createFixedClock();
    const service = new RealtimeService(eventBus as unknown as EventBus, hub, logger as unknown as Logger, clock);
    return { eventBus, hub, logger, clock, service };
}

export function setupRealtimeController(pingIntervalSeconds = 25): RealtimeControllerSetup {
    const realtimeService = createMockRealtimeService();
    return {
        realtimeService,
        controller: new RealtimeController(realtimeService as unknown as RealtimeService, pingIntervalSeconds),
    };
}
