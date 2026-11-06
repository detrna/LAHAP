import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.findMissingScheduleIds (unit)", () => {
    it("asks once per id", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMissingScheduleIds.mockResolvedValue(["s-2"]);

        expect(await service.findMissingScheduleIds(["s-1", "s-2", "s-1"])).toEqual(["s-2"]);
        expect(repository.findMissingScheduleIds).toHaveBeenCalledWith(["s-1", "s-2"]);
    });

    it("skips the repository for no ids", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.findMissingScheduleIds([])).toEqual([]);
        expect(repository.findMissingScheduleIds).not.toHaveBeenCalled();
    });
});
