import type { CatalogRepository } from "./interfaces/catalog.repository.js";

export class CatalogService {
    constructor(readonly catalogRepository: CatalogRepository) {}
}
