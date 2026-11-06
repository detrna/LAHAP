import { vi } from "vitest";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import { NotificationsContainer } from "../../../src/modules/notifications/container/notifications.container.js";
import {
    noAnnouncementAudience,
    type AnnouncementAudience,
} from "../../../src/modules/notifications/service/interfaces/announcement-audience.js";
import type { RealtimePublisher } from "../../../src/modules/notifications/service/interfaces/realtime-publisher.js";
import { createCatalogContainer } from "./catalog-container.js";
import { createUsersContainer } from "./users-container.js";

export interface NotificationsContainerOverrides {
    readonly realtime?: RealtimePublisher | undefined;
    readonly audience?: AnnouncementAudience | undefined;
}

export function createNotificationsContainer(
    deps: ModuleDeps,
    overrides: NotificationsContainerOverrides = {},
): NotificationsContainer {
    const users = createUsersContainer(deps).service;
    const catalog = createCatalogContainer(deps).service;
    return new NotificationsContainer({
        ...deps,
        realtime: overrides.realtime ?? { publish: vi.fn(async () => undefined) },
        recipients: users,
        targets: catalog,
        audience: overrides.audience ?? noAnnouncementAudience,
    });
}
