import { describe, expect, it } from "vitest";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.getPackage (unit)", () => {
    it("returns an inactive package too, with its subscriber count", async () => {
        const { repository, orderActivity, service } = setupCatalogService();
        repository.findPackageById.mockResolvedValue(buildPackageRecord({ id: "p-1", isActive: false }));
        orderActivity.countActiveSubscribers.mockResolvedValue(new Map([["p-1", 3]]));

        expect(await service.getPackage("p-1")).toMatchObject({
            id: "p-1",
            isActive: false,
            isAvailable: false,
            activeSubscriberCount: 3,
        });
    });

    it("throws PackageNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.getPackage("missing")).rejects.toBeInstanceOf(PackageNotFoundError);
    });
});
