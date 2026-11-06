import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import { UsersContainer } from "../../../src/modules/users/container/users.container.js";
import type { SessionRevoker } from "../../../src/modules/users/service/interfaces/session-revoker.js";
import { createCatalogContainer } from "./catalog-container.js";
import { createOrdersContainer } from "./orders-container.js";
import { createTiersContainer } from "./tiers-container.js";

export function createUsersContainer(deps: ModuleDeps, sessions?: SessionRevoker | undefined): UsersContainer {
    return new UsersContainer({
        ...deps,
        allergies: createCatalogContainer(deps).service,
        memberships: createTiersContainer(deps).service,
        subscriptions: createOrdersContainer(deps).service,
        sessions,
    });
}
