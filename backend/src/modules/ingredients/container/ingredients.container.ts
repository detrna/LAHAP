import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { IngredientsController } from "../controller/ingredients.controller.js";
import { PrismaIngredientsRepository } from "../repository/prisma/ingredients-repository.js";
import { createIngredientsRouter } from "../routes/ingredients.routes.js";
import { IngredientsService } from "../service/ingredients.service.js";
import type { AllergyLookup } from "../service/interfaces/allergy-lookup.js";
import type { MenuLookup } from "../service/interfaces/menu-lookup.js";
import type { PhotoKeys } from "../service/interfaces/photo-keys.js";
import type { PortionCounts } from "../service/interfaces/portion-counts.js";

export interface IngredientsContainerDeps extends ModuleDeps {
    readonly photoKeys: PhotoKeys;
    readonly allergies: AllergyLookup;
    readonly menus: MenuLookup;
    readonly portions: PortionCounts;
}

export class IngredientsContainer {
    readonly service: IngredientsService;
    readonly router: Router;

    constructor({ db, adapters, photoKeys, allergies, menus, portions }: IngredientsContainerDeps) {
        const repository = new PrismaIngredientsRepository(db);
        this.service = new IngredientsService(
            repository,
            adapters.objectStorage,
            photoKeys,
            allergies,
            adapters.clock,
            menus,
            portions,
        );
        const controller = new IngredientsController(this.service);
        this.router = createIngredientsRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
