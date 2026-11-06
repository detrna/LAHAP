import { IngredientsContainer } from "../../../src/modules/ingredients/container/ingredients.container.js";
import type { AllergyLookup } from "../../../src/modules/ingredients/service/interfaces/allergy-lookup.js";
import type { PhotoKeys } from "../../../src/modules/ingredients/service/interfaces/photo-keys.js";
import type { ModuleDeps } from "../../../src/modules/module-deps.js";

export interface IngredientsContainerOverrides {
    readonly photoKeys?: PhotoKeys | undefined;
    readonly allergies: AllergyLookup;
}

const acceptAnyPhoto: PhotoKeys = { assertPhotoKeyExists: async () => undefined };

export function createIngredientsContainer(
    deps: ModuleDeps,
    overrides: IngredientsContainerOverrides,
): IngredientsContainer {
    return new IngredientsContainer({
        ...deps,
        photoKeys: overrides.photoKeys ?? acceptAnyPhoto,
        allergies: overrides.allergies,
    });
}
