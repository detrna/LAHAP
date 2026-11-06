import { describe, expect, it } from "vitest";
import { buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.listSchedules (unit)", () => {
    it("passes the filters on and presents the page", async () => {
        const { repository, service } = setupCatalogService();
        repository.listSchedules.mockResolvedValue({ items: [buildScheduleRecord({ id: "s-1" })], total: 3 });
        const input = {
            packageId: "p-1",
            from: Temporal.PlainDate.from("2026-11-01"),
            isPublished: false,
            skip: 0,
            take: 20,
        };

        const page = await service.listSchedules(input);

        expect(repository.listSchedules).toHaveBeenCalledWith(input);
        expect(page).toMatchObject({ total: 3, items: [{ id: "s-1" }] });
    });
});
