import { describe, expect, it } from "vitest";
import { buildAllergyRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getAllergiesByIds (unit)", () => {
    it("maps the records in the repository's order with Jakarta timestamps", async () => {
        const { repository, service } = setupCatalogService();
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
        const { repository, service } = setupCatalogService();

        expect(await service.getAllergiesByIds([])).toEqual([]);
        expect(repository.findAllergiesByIds).not.toHaveBeenCalled();
    });
});
