import type { ModuleDeps } from "../../../src/modules/module-deps.js";
import { TiersContainer } from "../../../src/modules/tiers/container/tiers.container.js";
import { noOrderStats, type OrderStats } from "../../../src/modules/tiers/service/interfaces/order-stats.js";
import type { PhotoKeys } from "../../../src/modules/tiers/service/interfaces/photo-keys.js";

export interface TiersContainerOverrides {
    readonly photoKeys?: PhotoKeys | undefined;
    readonly orderStats?: OrderStats | undefined;
}

const acceptAnyPhoto: PhotoKeys = { assertPhotoKeyExists: async () => undefined };

export function createTiersContainer(deps: ModuleDeps, overrides: TiersContainerOverrides = {}): TiersContainer {
    return new TiersContainer({
        ...deps,
        photoKeys: overrides.photoKeys ?? acceptAnyPhoto,
        orderStats: overrides.orderStats ?? noOrderStats,
    });
}
