import type { FilesService } from "../service/files.service.js";
import { uploadFile } from "./upload-file.js";

export class FilesController {
    constructor(readonly filesService: FilesService) {}

    uploadFile = uploadFile.bind(this);
}
