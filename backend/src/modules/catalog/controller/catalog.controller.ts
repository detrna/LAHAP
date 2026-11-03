import type { CatalogService } from "../service/catalog.service.js";

export class CatalogController {
    constructor(readonly catalogService: CatalogService) {}
}
