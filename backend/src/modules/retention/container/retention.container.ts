import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { RetentionController } from "../controller/retention.controller.js";
import { PrismaRetentionRepository } from "../repository/prisma/retention-repository.js";
import { createRetentionRouter } from "../routes/retention.routes.js";
import type { ChurnHistory } from "../service/interfaces/churn-history.js";
import type { CustomerDirectory } from "../service/interfaces/customer-directory.js";
import type { PackageNames } from "../service/interfaces/package-names.js";
import type { WinBackPromos } from "../service/interfaces/win-back-promos.js";
import { RetentionService } from "../service/retention.service.js";

export interface RetentionContainerDeps extends Pick<ModuleDeps, "db" | "adapters"> {
    readonly churn: ChurnHistory;
    readonly customers: CustomerDirectory;
    readonly packages: PackageNames;
    readonly promos: WinBackPromos;
}

export class RetentionContainer {
    readonly service: RetentionService;
    readonly router: Router;

    constructor({ db, adapters, churn, customers, packages, promos }: RetentionContainerDeps) {
        const repository = new PrismaRetentionRepository(db);
        this.service = new RetentionService(repository, {
            churn,
            customers,
            packages,
            promos,
            clock: adapters.clock,
        });
        const controller = new RetentionController(this.service);
        this.router = createRetentionRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
