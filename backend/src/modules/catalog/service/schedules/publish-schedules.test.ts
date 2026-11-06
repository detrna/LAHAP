import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { buildPackageRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuScheduleNotFoundError, PackageNotFoundError } from "../interfaces/catalog.repository.js";

const date = (value: string) => Temporal.PlainDate.from(value);

describe("CatalogService.publishSchedules (unit)", () => {
    describe("by ids", () => {
        it("publishes the schedules", async () => {
            const { repository, service } = setupCatalogService();
            repository.findSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-1" })]);
            repository.setSchedulesPublished.mockResolvedValue(1);

            expect(await service.publishSchedules({ ids: ["s-1"], publish: true })).toEqual({ updatedCount: 1 });
            expect(repository.setSchedulesPublished).toHaveBeenCalledWith({ ids: ["s-1"] }, true);
        });

        it("throws MenuScheduleNotFoundError for an unknown id", async () => {
            const { service } = setupCatalogService();

            await expect(service.publishSchedules({ ids: ["s-9"], publish: true })).rejects.toBeInstanceOf(
                MenuScheduleNotFoundError,
            );
        });

        it("gives 422 when publishing a schedule without a primary menu", async () => {
            const { repository, service } = setupCatalogService();
            repository.findSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-1", primaryMenuId: null })]);

            await expect(service.publishSchedules({ ids: ["s-1"], publish: true })).rejects.toBeInstanceOf(
                InvalidStateError,
            );
        });

        it("unpublishes whatever the menus and orders", async () => {
            const { repository, service } = setupCatalogService();
            repository.findSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-1", primaryMenuId: null })]);

            await service.publishSchedules({ ids: ["s-1"], publish: false });

            expect(repository.setSchedulesPublished).toHaveBeenCalledWith({ ids: ["s-1"] }, false);
        });
    });

    describe("by package and range", () => {
        const RANGE = { packageId: "p-1", from: date("2026-11-09"), to: date("2026-11-15") };

        it("publishes the range", async () => {
            const { repository, service } = setupCatalogService();
            repository.findPackageById.mockResolvedValue(buildPackageRecord({ id: "p-1" }));
            repository.setSchedulesPublished.mockResolvedValue(5);

            expect(await service.publishSchedules({ ...RANGE, publish: true })).toEqual({ updatedCount: 5 });
            expect(repository.setSchedulesPublished).toHaveBeenCalledWith(RANGE, true);
        });

        it("throws PackageNotFoundError for an unknown package", async () => {
            const { service } = setupCatalogService();

            await expect(service.publishSchedules({ ...RANGE, publish: true })).rejects.toBeInstanceOf(
                PackageNotFoundError,
            );
        });
    });
});
