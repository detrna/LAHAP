import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { SettingsController } from "../controller/settings.controller.js";
import { PrismaSettingsRepository } from "../repository/prisma/settings-repository.js";
import { createSettingsRouter } from "../routes/settings.routes.js";
import { SettingsService } from "../service/settings.service.js";

export class SettingsContainer {
    readonly service: SettingsService;
    readonly router: Router;

    constructor({ db, adapters }: ModuleDeps) {
        const repository = new PrismaSettingsRepository(db);
        this.service = new SettingsService(repository);
        const controller = new SettingsController(this.service);
        this.router = createSettingsRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
