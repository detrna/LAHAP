import { describe, expect, it } from "vitest";
import { buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.findSchedules (unit)", () => {
    it("returns summaries with the menu ids, reading each id once", async () => {
        const { repository, service } = setupCatalogService();
        repository.findSchedules.mockResolvedValue([
            buildScheduleRecord({ id: "s-1", primaryMenuId: "m-1", alternativeMenuId: "m-2" }),
        ]);

        const summaries = await service.findSchedules({ ids: ["s-1", "s-1"] });

        expect(repository.findSchedules).toHaveBeenCalledWith({ ids: ["s-1"] });
        expect(summaries).toEqual([
            {
                id: "s-1",
                packageId: "00000000-0000-4000-8000-000000000001",
                date: "2026-11-12",
                deliveryTime: { time: "07:00", range: "Pagi" },
                isPublished: false,
                primaryMenuId: "m-1",
                alternativeMenuId: "m-2",
            },
        ]);
    });

    it("passes a filter without ids as is", async () => {
        const { repository, service } = setupCatalogService();
        const filter = { packageId: "p-1", from: Temporal.PlainDate.from("2026-11-10") };

        await service.findSchedules(filter);

        expect(repository.findSchedules).toHaveBeenCalledWith(filter);
    });
});
