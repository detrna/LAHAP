import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { buildPackageRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

const date = (value: string) => Temporal.PlainDate.from(value);

function setup() {
    const context = setupCatalogService();
    context.repository.findPackageById.mockResolvedValue(buildPackageRecord({ id: "p-1" }));
    return context;
}

describe("CatalogService.listPublishedSchedules (unit)", () => {
    it("reads the published schedules of the next 31 days by default", async () => {
        const { repository, service } = setup();
        repository.findSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-1", isPublished: true })]);

        const schedules = await service.listPublishedSchedules("p-1", {});

        expect(repository.findSchedules).toHaveBeenCalledWith({
            packageId: "p-1",
            from: date("2026-11-03"),
            to: date("2026-12-03"),
            isPublished: true,
        });
        expect(schedules.map(schedule => schedule.id)).toEqual(["s-1"]);
    });

    it("keeps the given range", async () => {
        const { repository, service } = setup();

        await service.listPublishedSchedules("p-1", { from: date("2026-11-10"), to: date("2026-11-16") });

        expect(repository.findSchedules).toHaveBeenCalledWith(
            expect.objectContaining({ from: date("2026-11-10"), to: date("2026-11-16") }),
        );
    });

    it("refuses a range longer than 62 days", async () => {
        const { service } = setup();

        await expect(
            service.listPublishedSchedules("p-1", { from: date("2026-11-01"), to: date("2027-01-02") }),
        ).rejects.toBeInstanceOf(ValidationError);
    });

    it("gives 404 for a package that isn't available", async () => {
        const { repository, service } = setupCatalogService();
        repository.findPackageById.mockResolvedValue(buildPackageRecord({ id: "p-1", isActive: false }));

        await expect(service.listPublishedSchedules("p-1", {})).rejects.toBeInstanceOf(PackageNotFoundError);
        expect(repository.findSchedules).not.toHaveBeenCalled();
    });
});
