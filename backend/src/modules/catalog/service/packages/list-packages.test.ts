import { describe, expect, it } from "vitest";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

const ID_A = "00000000-0000-4000-8000-0000000000a1";
const ID_B = "00000000-0000-4000-8000-0000000000a2";

describe("CatalogService.listPackages (unit)", () => {
    it("passes the filters and page window to the repository", async () => {
        const { repository, service } = setupCatalogService();

        await service.listPackages({ search: "diet", isActive: false, skip: 20, take: 10 });

        expect(repository.listPackages).toHaveBeenCalledWith({ search: "diet", isActive: false, skip: 20, take: 10 });
    });

    it("adds each package's subscriber count from one call per page", async () => {
        const { repository, orderActivity, service } = setupCatalogService();
        repository.listPackages.mockResolvedValue({
            items: [buildPackageRecord({ id: ID_A }), buildPackageRecord({ id: ID_B })],
            total: 2,
        });
        orderActivity.countActiveSubscribers.mockResolvedValue(new Map([[ID_A, 5]]));

        const page = await service.listPackages({ skip: 0, take: 20 });

        expect(page.total).toBe(2);
        expect(page.items.map(item => item.activeSubscriberCount)).toEqual([5, 0]);
        expect(orderActivity.countActiveSubscribers).toHaveBeenCalledTimes(1);
        expect(orderActivity.countActiveSubscribers).toHaveBeenCalledWith(
            [ID_A, ID_B],
            Temporal.PlainDate.from("2026-11-03"),
        );
    });

    it("signs each distinct photo key once", async () => {
        const { repository, objectStorage, service } = setupCatalogService();
        repository.listPackages.mockResolvedValue({
            items: [buildPackageRecord({ id: ID_A }), buildPackageRecord({ id: ID_B })],
            total: 2,
        });

        const page = await service.listPackages({ skip: 0, take: 20 });

        expect(objectStorage.getSignedUrl).toHaveBeenCalledTimes(1);
        expect(page.items.map(item => item.photoUrl)).toEqual([
            "https://storage.test/packages/2026/11/3f2b6c1e.webp?signed",
            "https://storage.test/packages/2026/11/3f2b6c1e.webp?signed",
        ]);
    });

    it("skips order activity and signing for an empty page", async () => {
        const { orderActivity, objectStorage, service } = setupCatalogService();

        expect(await service.listPackages({ skip: 0, take: 20 })).toEqual({ items: [], total: 0 });
        expect(orderActivity.countActiveSubscribers).not.toHaveBeenCalled();
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});
