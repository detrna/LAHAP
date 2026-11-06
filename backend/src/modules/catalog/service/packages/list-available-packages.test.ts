import { describe, expect, it } from "vitest";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.listAvailablePackages (unit)", () => {
    it("asks only for packages available at the clock's current moment", async () => {
        const { repository, service } = setupCatalogService();

        await service.listAvailablePackages({ search: "diet", skip: 0, take: 20 });

        expect(repository.listPackages).toHaveBeenCalledWith({
            search: "diet",
            skip: 0,
            take: 20,
            availableAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        });
    });

    it("leaves the admin-only subscriber count out", async () => {
        const { repository, orderActivity, service } = setupCatalogService();
        repository.listPackages.mockResolvedValue({ items: [buildPackageRecord()], total: 1 });

        const page = await service.listAvailablePackages({ skip: 0, take: 20 });

        expect(page.items[0]).not.toHaveProperty("activeSubscriberCount");
        expect(orderActivity.countActiveSubscribers).not.toHaveBeenCalled();
    });
});
