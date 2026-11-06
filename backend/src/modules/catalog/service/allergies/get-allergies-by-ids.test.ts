import { describe, expect, it } from "vitest";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { createMockCatalogRepository } from "../../test-utils/mocks/catalog.mocks.js";
import { CatalogService } from "../catalog.service.js";

describe("CatalogService.getAllergiesByIds (unit)", () => {
    it("maps the records in the repository's order with Jakarta timestamps", async () => {
        const repository = createMockCatalogRepository();
        const service = new CatalogService(repository);
        repository.findAllergiesByIds.mockResolvedValue([
            buildAllergyRecord({ id: "00000000-0000-4000-8000-000000000002", name: "Kacang" }),
            buildAllergyRecord({ id: "00000000-0000-4000-8000-000000000001", name: "Susu" }),
        ]);

        expect(
            await service.getAllergiesByIds([
                "00000000-0000-4000-8000-000000000001",
                "00000000-0000-4000-8000-000000000002",
                "00000000-0000-4000-8000-000000000001",
            ]),
        ).toEqual([
            {
                id: "00000000-0000-4000-8000-000000000002",
                name: "Kacang",
                createdAt: "2026-11-03T08:00:00.000+07:00",
                updatedAt: "2026-11-03T08:00:00.000+07:00",
            },
            {
                id: "00000000-0000-4000-8000-000000000001",
                name: "Susu",
                createdAt: "2026-11-03T08:00:00.000+07:00",
                updatedAt: "2026-11-03T08:00:00.000+07:00",
            },
        ]);
        expect(repository.findAllergiesByIds).toHaveBeenCalledWith([
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000002",
        ]);
    });

    it("skips the repository for no ids", async () => {
        const repository = createMockCatalogRepository();

        expect(await new CatalogService(repository).getAllergiesByIds([])).toEqual([]);
        expect(repository.findAllergiesByIds).not.toHaveBeenCalled();
    });
});
