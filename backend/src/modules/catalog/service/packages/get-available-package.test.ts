import { describe, expect, it } from "vitest";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

describe("CatalogService.getAvailablePackage (unit)", () => {
    it("returns an available package without the subscriber count", async () => {
        const { repository, service } = setupCatalogService();
        repository.findPackageById.mockResolvedValue(buildPackageRecord({ id: "p-1" }));

        const item = await service.getAvailablePackage("p-1");

        expect(item.id).toBe("p-1");
        expect(item).not.toHaveProperty("activeSubscriberCount");
    });

    it.each([
        ["switched off", { isActive: false }],
        ["not started", { startAt: Temporal.PlainDateTime.from("2026-11-03T01:00:01") }],
        ["ended", { endAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00") }],
    ])("answers not found for a package that is %s", async (_, overrides) => {
        const { repository, service } = setupCatalogService();
        repository.findPackageById.mockResolvedValue(buildPackageRecord(overrides));

        await expect(service.getAvailablePackage("p-1")).rejects.toBeInstanceOf(PackageNotFoundError);
    });

    it("throws PackageNotFoundError when missing", async () => {
        const { service } = setupCatalogService();

        await expect(service.getAvailablePackage("missing")).rejects.toBeInstanceOf(PackageNotFoundError);
    });
});
