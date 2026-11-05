import { ValidationError } from "../../../shared/errors/validation-error.js";
import type { FilesService } from "./files.service.js";

export async function assertPhotoKeyExists(this: FilesService, key: string, path = "photoKey"): Promise<void> {
    if (await this.objectStorage.exists(key)) return;
    throw new ValidationError([{ target: "body", path, message: "photo does not exist", code: "photo_not_found" }]);
}
