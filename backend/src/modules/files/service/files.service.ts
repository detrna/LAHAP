import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { assertPhotoKeyExists } from "./assert-photo-key-exists.js";
import { uploadFile } from "./upload-file.js";

export class FilesService {
    constructor(
        readonly objectStorage: ObjectStorage,
        readonly clock: Clock,
    ) {}

    uploadFile = uploadFile;
    assertPhotoKeyExists = assertPhotoKeyExists;
}
