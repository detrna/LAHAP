import { randomInt } from "node:crypto";
import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { PromoCodesController } from "../controller/promo-codes.controller.js";
import { PrismaPromoCodesRepository } from "../repository/prisma/promo-codes-repository.js";
import { createPromoCodesRouter } from "../routes/promo-codes.routes.js";
import type { PromoUsage } from "../service/interfaces/promo-usage.js";
import { PromoCodesService } from "../service/promo-codes.service.js";

export interface PromoCodesContainerDeps extends ModuleDeps {
    readonly promoUsage: PromoUsage;
}

export class PromoCodesContainer {
    readonly service: PromoCodesService;
    readonly router: Router;

    constructor({ db, adapters, promoUsage }: PromoCodesContainerDeps) {
        const repository = new PrismaPromoCodesRepository(db);
        this.service = new PromoCodesService(repository, adapters.clock, max => randomInt(max), promoUsage);
        const controller = new PromoCodesController(this.service);
        this.router = createPromoCodesRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
