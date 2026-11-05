import { AppError } from "../../../shared/errors/app-error.js";
import type { PhotoFolder } from "../../../shared/media/photo.js";

export class FolderNotAllowedError extends AppError {
    readonly code = "FORBIDDEN";
    readonly statusCode = 403;

    constructor(public readonly folder: PhotoFolder) {
        super(`uploading to "${folder}" is not allowed for this role`);
    }
}
