import { CatalogContainer } from "../../../src/modules/catalog/container/catalog.container.js";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import { OrdersContainer } from "../../../src/modules/orders/container/orders.container.js";
import { TiersContainer } from "../../../src/modules/tiers/container/tiers.container.js";
import { UsersContainer } from "../../../src/modules/users/container/users.container.js";
import type { SessionRevoker } from "../../../src/modules/users/service/interfaces/session-revoker.js";

export function createUsersContainer(deps: ModuleDeps, sessions?: SessionRevoker | undefined): UsersContainer {
    return new UsersContainer({
        ...deps,
        allergies: new CatalogContainer(deps).service,
        memberships: new TiersContainer(deps).service,
        subscriptions: new OrdersContainer(deps).service,
        sessions,
    });
}
