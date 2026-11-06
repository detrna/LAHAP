import { vi } from "vitest";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export function createMockCatalogRepository(): Mocked<CatalogRepository> {
    return {
        findMissingAllergyIds: vi.fn(async () => []),
        findAllergiesByIds: vi.fn(async () => []),
    } as Mocked<CatalogRepository>;
}
