import { createFixedClock, type FixedClock } from "../../../../../tests/utils/factory/clock/clock.js";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { IngredientsController } from "../../controller/ingredients.controller.js";
import { IngredientsService } from "../../service/ingredients.service.js";
import type { AllergyLookup } from "../../service/interfaces/allergy-lookup.js";
import type { IngredientsRepository } from "../../service/interfaces/ingredients.repository.js";
import type { MenuLookup } from "../../service/interfaces/menu-lookup.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { PortionCounts } from "../../service/interfaces/portion-counts.js";
import {
    createMockAllergyLookup,
    createMockIngredientsRepository,
    createMockIngredientsService,
    createMockMenuLookup,
    createMockObjectStorage,
    createMockPhotoKeys,
    createMockPortionCounts,
    type Mocked,
    type MockedIngredientsService,
    type MockedObjectStorage,
} from "../mocks/ingredients.mocks.js";

export interface IngredientsServiceSetup {
    readonly repository: Mocked<IngredientsRepository>;
    readonly objectStorage: MockedObjectStorage;
    readonly photoKeys: Mocked<PhotoKeys>;
    readonly allergies: Mocked<AllergyLookup>;
    readonly clock: FixedClock;
    readonly menus: Mocked<MenuLookup>;
    readonly portions: Mocked<PortionCounts>;
    readonly service: IngredientsService;
}

export interface IngredientsControllerSetup {
    readonly ingredientsService: MockedIngredientsService;
    readonly controller: IngredientsController;
}

export function setupIngredientsService(): IngredientsServiceSetup {
    const repository = createMockIngredientsRepository();
    const objectStorage = createMockObjectStorage();
    const photoKeys = createMockPhotoKeys();
    const allergies = createMockAllergyLookup();
    const clock = createFixedClock();
    const menus = createMockMenuLookup();
    const portions = createMockPortionCounts();
    return {
        repository,
        objectStorage,
        photoKeys,
        allergies,
        clock,
        menus,
        portions,
        service: new IngredientsService(
            repository,
            objectStorage as unknown as ObjectStorage,
            photoKeys,
            allergies,
            clock,
            menus,
            portions,
        ),
    };
}

export function setupIngredientsController(): IngredientsControllerSetup {
    const ingredientsService = createMockIngredientsService();
    return {
        ingredientsService,
        controller: new IngredientsController(ingredientsService as unknown as IngredientsService),
    };
}
