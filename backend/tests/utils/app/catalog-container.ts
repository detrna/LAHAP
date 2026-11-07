import { CatalogContainer } from "../../../src/modules/catalog/container/catalog.container.js";
import type { IngredientLookup } from "../../../src/modules/catalog/service/interfaces/ingredient-lookup.js";
import type { OrderActivity } from "../../../src/modules/catalog/service/interfaces/order-activity.js";
import { noOrderActivity } from "../../../src/modules/catalog/service/interfaces/order-activity.js";
import type { ScheduleAnnouncer } from "../../../src/modules/catalog/service/interfaces/schedule-announcer.js";
import { noScheduleAnnouncer } from "../../../src/modules/catalog/service/interfaces/schedule-announcer.js";
import type { PhotoKeys } from "../../../src/modules/catalog/service/interfaces/photo-keys.js";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";

export interface CatalogContainerOverrides {
    readonly photoKeys?: PhotoKeys | undefined;
    readonly ingredients?: IngredientLookup | undefined;
    readonly orderActivity?: OrderActivity | undefined;
    readonly announcer?: ScheduleAnnouncer | undefined;
}

const acceptAnyPhoto: PhotoKeys = { assertPhotoKeyExists: async () => undefined };
const noIngredients: IngredientLookup = {
    findMissingIngredientIds: async ids => [...ids],
    getIngredientsByIds: async () => [],
};

export function createCatalogContainer(deps: ModuleDeps, overrides: CatalogContainerOverrides = {}): CatalogContainer {
    return new CatalogContainer({
        ...deps,
        photoKeys: overrides.photoKeys ?? acceptAnyPhoto,
        ingredients: overrides.ingredients ?? noIngredients,
        orderActivity: overrides.orderActivity ?? noOrderActivity,
        announcer: overrides.announcer ?? noScheduleAnnouncer,
    });
}
