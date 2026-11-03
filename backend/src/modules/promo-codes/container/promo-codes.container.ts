import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { PromoCodesController } from "../controller/promo-codes.controller.js";
import { PrismaPromoCodesRepository } from "../repository/prisma/promo-codes-repository.js";
import { createPromoCodesRouter } from "../routes/promo-codes.routes.js";
import { PromoCodesService } from "../service/promo-codes.service.js";

export class PromoCodesContainer {
    readonly service: PromoCodesService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaPromoCodesRepository(db);
        this.service = new PromoCodesService(repository);
        const controller = new PromoCodesController(this.service);
        this.router = createPromoCodesRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
