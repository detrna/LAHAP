import type { FilesService } from "../service/files.service.js";

export class FilesController {
    constructor(readonly filesService: FilesService) {}
}
