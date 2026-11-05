import { Router } from "express";
import { authenticate, authorize, uploadImage, validateBody } from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { FilesController } from "../controller/files.controller.js";
import { fileUploadSchema } from "../schema/files.schemas.js";

export interface FilesRouterDeps {
    readonly controller: FilesController;
    readonly tokenProvider: TokenProvider;
    readonly maxBytes: number;
}

export function createFilesRouter({ controller, tokenProvider, maxBytes }: FilesRouterDeps): Router {
    const router = Router();

    router.post(
        "/files",
        authenticate({ tokenProvider }),
        authorize("ADMIN", "COURIER"),
        uploadImage({ field: "file", maxBytes }),
        validateBody(fileUploadSchema),
        controller.uploadFile,
    );

    return router;
}
