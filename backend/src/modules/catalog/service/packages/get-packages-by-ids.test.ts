import { describe, expect, it } from "vitest";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getPackagesByIds (unit)", () => {
    it("asks once per distinct id and returns availability without the subscriber count", async () => {
        const { repository, orderActivity, service } = setupCatalogService();
        repository.findPackagesByIds.mockResolvedValue([
            buildPackageRecord({ id: "a" }),
            buildPackageRecord({ id: "b", isActive: false }),
        ]);

        const items = await service.getPackagesByIds(["a", "b", "a"]);

        expect(repository.findPackagesByIds).toHaveBeenCalledWith(["a", "b"]);
        expect(items.map(item => [item.id, item.isAvailable])).toEqual([
            ["a", true],
            ["b", false],
        ]);
        expect(items[0]).not.toHaveProperty("activeSubscriberCount");
        expect(orderActivity.countActiveSubscribers).not.toHaveBeenCalled();
    });

    it("skips the repository for no ids", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.getPackagesByIds([])).toEqual([]);
        expect(repository.findPackagesByIds).not.toHaveBeenCalled();
    });
});
