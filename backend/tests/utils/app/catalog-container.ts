import { CatalogContainer } from "../../../src/modules/catalog/container/catalog.container.js";
import type { OrderActivity } from "../../../src/modules/catalog/service/interfaces/order-activity.js";
import { noOrderActivity } from "../../../src/modules/catalog/service/interfaces/order-activity.js";
import type { PhotoKeys } from "../../../src/modules/catalog/service/interfaces/photo-keys.js";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";

export interface CatalogContainerOverrides {
    readonly photoKeys?: PhotoKeys | undefined;
    readonly orderActivity?: OrderActivity | undefined;
}

const acceptAnyPhoto: PhotoKeys = { assertPhotoKeyExists: async () => undefined };

export function createCatalogContainer(deps: ModuleDeps, overrides: CatalogContainerOverrides = {}): CatalogContainer {
    return new CatalogContainer({
        ...deps,
        photoKeys: overrides.photoKeys ?? acceptAnyPhoto,
        orderActivity: overrides.orderActivity ?? noOrderActivity,
    });
}
