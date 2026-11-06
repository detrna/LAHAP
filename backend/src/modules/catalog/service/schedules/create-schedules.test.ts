import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { buildPackageRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { UnknownMenuError } from "../interfaces/catalog.repository.js";
import type { CreateScheduleInput } from "./create-schedules.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const time = (value: string) => Temporal.PlainTime.from(value);

const ITEM: CreateScheduleInput = {
    packageId: "p-1",
    date: date("2026-11-03"),
    deliveryTime: time("07:00"),
    primaryMenuId: "m-primary",
};

function setup() {
    const context = setupCatalogService();
    context.repository.findPackagesByIds.mockResolvedValue([buildPackageRecord({ id: "p-1" })]);
    context.repository.findMenuKinds.mockResolvedValue([
        { id: "m-primary", isAlternative: false },
        { id: "m-alt", isAlternative: true },
    ]);
    context.repository.createSchedules.mockResolvedValue([buildScheduleRecord({ id: "s-1" })]);
    return context;
}

async function issuesOf(promise: Promise<unknown>) {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues.map(issue => [issue.path, issue.code]);
}

describe("CatalogService.createSchedules (unit)", () => {
    it("creates the batch with defaults, today included", async () => {
        const { repository, service } = setup();

        const created = await service.createSchedules([ITEM]);

        expect(repository.createSchedules).toHaveBeenCalledWith([
            { ...ITEM, alternativeMenuId: null, isPublished: false },
        ]);
        expect(created.map(schedule => schedule.id)).toEqual(["s-1"]);
    });

    it("reports every item's problems with its path", async () => {
        const { repository, service } = setup();

        const issues = await issuesOf(
            service.createSchedules([
                { ...ITEM, packageId: "p-missing" },
                { ...ITEM, date: date("2026-11-02"), deliveryTime: time("09:00") },
                { ...ITEM, alternativeMenuId: "m-primary" },
                { ...ITEM, alternativeMenuId: "m-primary", primaryMenuId: "m-alt" },
            ]),
        );

        expect(issues).toEqual([
            ["items.0.packageId", "package_not_found"],
            ["items.1.deliveryTime", "unknown_delivery_time"],
            ["items.1.date", "date_in_past"],
            ["items.2.alternativeMenuId", "same_as_primary"],
            ["items.3.alternativeMenuId", "not_alternative"],
        ]);
        expect(repository.createSchedules).not.toHaveBeenCalled();
    });

    it("throws UnknownMenuError for menus that don't exist", async () => {
        const { service } = setup();

        const error = await service
            .createSchedules([{ ...ITEM, alternativeMenuId: "m-missing" }])
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(UnknownMenuError);
        expect((error as UnknownMenuError).menuIds).toEqual(["m-missing"]);
    });

    it("accepts an alternative menu", async () => {
        const { repository, service } = setup();

        await service.createSchedules([{ ...ITEM, alternativeMenuId: "m-alt", isPublished: true }]);

        expect(repository.createSchedules).toHaveBeenCalledWith([
            expect.objectContaining({ alternativeMenuId: "m-alt", isPublished: true }),
        ]);
    });
});
