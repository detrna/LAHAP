import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { FilesController } from "../controller/files.controller.js";
import { createFilesRouter } from "../routes/files.routes.js";
import { FilesService } from "../service/files.service.js";

export class FilesContainer {
    readonly service: FilesService;
    readonly router: Router;

    constructor({ adapters }: ModuleDeps) {
        this.service = new FilesService();
        const controller = new FilesController(this.service);
        this.router = createFilesRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}
