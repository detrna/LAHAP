import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { FilesController } from "../controller/files.controller.js";

export interface FilesRouterDeps {
    readonly controller: FilesController;
    readonly tokenProvider: TokenProvider;
}

export function createFilesRouter(_deps: FilesRouterDeps): Router {
    const router = Router();
    return router;
}
