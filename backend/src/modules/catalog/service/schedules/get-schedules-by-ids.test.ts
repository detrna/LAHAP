import { describe, expect, it } from "vitest";
import { buildMenuRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getSchedulesByIds (unit)", () => {
    it("returns the schedules with their menus, reading each id once", async () => {
        const { repository, service } = setupCatalogService();
        repository.findSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-1", primaryMenuId: "m-1" })]);
        repository.findMenusByIds.mockResolvedValue([buildMenuRecord({ id: "m-1" })]);

        const schedules = await service.getSchedulesByIds(["s-1", "s-1"]);

        expect(repository.findSchedules).toHaveBeenCalledWith({ ids: ["s-1"] });
        expect(schedules[0]?.menus?.[0]).toMatchObject({ menuId: "m-1", isPrimary: true, menu: { id: "m-1" } });
    });

    it("answers an empty list without a query", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.getSchedulesByIds([])).toEqual([]);
        expect(repository.findSchedules).not.toHaveBeenCalled();
    });
});
