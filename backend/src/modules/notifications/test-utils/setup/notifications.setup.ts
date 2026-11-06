import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import { createMockLogger, type MockLogger } from "../../../../../tests/utils/mocks/logger.js";
import { NotificationsController } from "../../controller/notifications.controller.js";
import type { AnnouncementAudience } from "../../service/interfaces/announcement-audience.js";
import type { AnnouncementTargets } from "../../service/interfaces/announcement-targets.js";
import type { NotificationsRepository } from "../../service/interfaces/notifications.repository.js";
import type { RealtimePublisher } from "../../service/interfaces/realtime-publisher.js";
import type { RecipientDirectory } from "../../service/interfaces/recipient-directory.js";
import { NotificationsService } from "../../service/notifications.service.js";
import {
    createMockAnnouncementAudience,
    createMockAnnouncementTargets,
    createMockNotificationsRepository,
    createMockNotificationsService,
    createMockRealtimePublisher,
    createMockRecipientDirectory,
    type Mocked,
    type MockedNotificationsService,
} from "../mocks/notifications.mocks.js";

export interface NotificationsServiceSetup {
    readonly repository: Mocked<NotificationsRepository>;
    readonly realtime: Mocked<RealtimePublisher>;
    readonly recipients: Mocked<RecipientDirectory>;
    readonly targets: Mocked<AnnouncementTargets>;
    readonly audience: Mocked<AnnouncementAudience>;
    readonly clock: FixedClock;
    readonly logger: MockLogger;
    readonly service: NotificationsService;
}

export interface NotificationsControllerSetup {
    readonly notificationsService: MockedNotificationsService;
    readonly controller: NotificationsController;
}

export function setupNotificationsService(now?: string): NotificationsServiceSetup {
    const repository = createMockNotificationsRepository();
    const realtime = createMockRealtimePublisher();
    const recipients = createMockRecipientDirectory();
    const targets = createMockAnnouncementTargets();
    const audience = createMockAnnouncementAudience();
    const clock = createFixedClock(now);
    const logger = createMockLogger();
    return {
        repository,
        realtime,
        recipients,
        targets,
        audience,
        clock,
        logger,
        service: new NotificationsService(repository, realtime, recipients, targets, audience, clock, logger),
    };
}

export function setupNotificationsController(): NotificationsControllerSetup {
    const notificationsService = createMockNotificationsService();
    return {
        notificationsService,
        controller: new NotificationsController(notificationsService as unknown as NotificationsService),
    };
}
