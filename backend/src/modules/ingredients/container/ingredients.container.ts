import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { IngredientsController } from "../controller/ingredients.controller.js";
import { PrismaIngredientsRepository } from "../repository/prisma/ingredients-repository.js";
import { createIngredientsRouter } from "../routes/ingredients.routes.js";
import { IngredientsService } from "../service/ingredients.service.js";

export class IngredientsContainer {
    readonly service: IngredientsService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaIngredientsRepository(db);
        this.service = new IngredientsService(repository);
        const controller = new IngredientsController(this.service);
        this.router = createIngredientsRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
