import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import { IngredientsController } from "../../controller/ingredients.controller.js";
import { IngredientsService } from "../../service/ingredients.service.js";
import type { AllergyLookup } from "../../service/interfaces/allergy-lookup.js";
import type { IngredientsRepository } from "../../service/interfaces/ingredients.repository.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import {
    createMockAllergyLookup,
    createMockIngredientsRepository,
    createMockIngredientsService,
    createMockObjectStorage,
    createMockPhotoKeys,
    type Mocked,
    type MockedIngredientsService,
    type MockedObjectStorage,
} from "../mocks/ingredients.mocks.js";

export interface IngredientsServiceSetup {
    readonly repository: Mocked<IngredientsRepository>;
    readonly objectStorage: MockedObjectStorage;
    readonly photoKeys: Mocked<PhotoKeys>;
    readonly allergies: Mocked<AllergyLookup>;
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
    return {
        repository,
        objectStorage,
        photoKeys,
        allergies,
        service: new IngredientsService(repository, objectStorage as unknown as ObjectStorage, photoKeys, allergies),
    };
}

export function setupIngredientsController(): IngredientsControllerSetup {
    const ingredientsService = createMockIngredientsService();
    return {
        ingredientsService,
        controller: new IngredientsController(ingredientsService as unknown as IngredientsService),
    };
}
