import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { buildPackageRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuScheduleNotFoundError, UnknownMenuError } from "../interfaces/catalog.repository.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const time = (value: string) => Temporal.PlainTime.from(value);

const SCHEDULE = buildScheduleRecord({
    id: "s-1",
    packageId: "p-1",
    date: date("2026-11-12"),
    deliveryTime: time("07:00"),
    primaryMenuId: "m-primary",
    alternativeMenuId: "m-alt",
});

function setup(schedule = SCHEDULE) {
    const context = setupCatalogService();
    context.repository.findSchedules.mockResolvedValue([schedule]);
    context.repository.findPackagesByIds.mockResolvedValue([buildPackageRecord({ id: "p-1" })]);
    context.repository.findMenuKinds.mockImplementation(async ids =>
        ids
            .filter((id: string) => id !== "m-missing")
            .map((id: string) => ({ id, isAlternative: id.startsWith("m-alt") })),
    );
    context.repository.updateSchedules.mockResolvedValue([schedule]);
    return context;
}

async function errorOf(promise: Promise<unknown>) {
    return promise.then(
        () => undefined,
        (caught: unknown) => caught,
    );
}

describe("CatalogService.updateSchedules (unit)", () => {
    it("sends only the given changes and presents the result", async () => {
        const { repository, service } = setup();

        const updated = await service.updateSchedules([
            { id: "s-1", isPublished: true, primaryMenuId: "m-other", changeReason: "ganti" },
        ]);

        expect(repository.updateSchedules).toHaveBeenCalledWith([
            { id: "s-1", changes: { isPublished: true, primaryMenuId: "m-other" } },
        ]);
        expect(updated.map(schedule => schedule.id)).toEqual(["s-1"]);
    });

    it("throws MenuScheduleNotFoundError for an unknown id", async () => {
        const { repository, service } = setup();

        await expect(service.updateSchedules([{ id: "s-9", isPublished: true }])).rejects.toBeInstanceOf(
            MenuScheduleNotFoundError,
        );
        expect(repository.updateSchedules).not.toHaveBeenCalled();
    });

    it("throws UnknownMenuError for a menu that doesn't exist", async () => {
        const { service } = setup();

        await expect(service.updateSchedules([{ id: "s-1", primaryMenuId: "m-missing" }])).rejects.toBeInstanceOf(
            UnknownMenuError,
        );
    });

    it("checks the merged values, with batch paths", async () => {
        const { service } = setup();

        const error = await errorOf(
            service.updateSchedules([
                { id: "s-1", date: date("2026-11-01"), deliveryTime: time("09:00"), primaryMenuId: "m-alt" },
            ]),
        );

        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).issues.map(issue => [issue.path, issue.code])).toEqual([
            ["items.0.date", "date_in_past"],
            ["items.0.deliveryTime", "unknown_delivery_time"],
            ["items.0.alternativeMenuId", "same_as_primary"],
        ]);
    });

    it("refuses a regular menu as the alternative", async () => {
        const { service } = setup();

        const error = await errorOf(service.updateSchedules([{ id: "s-1", alternativeMenuId: "m-other" }]));

        expect((error as ValidationError).issues[0]?.code).toBe("not_alternative");
    });

    it("refuses to publish a schedule without a primary menu", async () => {
        const { service } = setup(buildScheduleRecord({ id: "s-1", primaryMenuId: null }));

        await expect(service.updateSchedules([{ id: "s-1", isPublished: true }])).rejects.toBeInstanceOf(
            InvalidStateError,
        );
    });

    it("skips the order checks when nothing moves or changes menus", async () => {
        const { orderActivity, service } = setup();

        await service.updateSchedules([{ id: "s-1", isPublished: false, date: SCHEDULE.date }]);

        expect(orderActivity.findSchedulesWithOrders).not.toHaveBeenCalled();
    });

    describe("schedules without active orders", () => {
        it("move freely, to today too", async () => {
            const { repository, service } = setup();

            await service.updateSchedules([{ id: "s-1", date: date("2026-11-03"), deliveryTime: time("12:00") }]);

            expect(repository.updateSchedules).toHaveBeenCalled();
        });
    });

    describe("moving a schedule with active orders", () => {
        function withOrders(schedule = SCHEDULE) {
            const context = setup(schedule);
            context.orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-1"]);
            context.orderActivity.findSubscriptionPeriods.mockResolvedValue([
                { scheduleId: "s-1", startDate: date("2026-11-09"), endDate: date("2026-11-15") },
            ]);
            return context;
        }

        it("allows a move between future dates inside the periods, with a reason", async () => {
            const { orderActivity, repository, service } = withOrders();

            await service.updateSchedules([{ id: "s-1", date: date("2026-11-14"), changeReason: "libur" }]);

            expect(orderActivity.findSchedulesWithOrders).toHaveBeenCalledWith(["s-1"], ["Pending", "Success"]);
            expect(orderActivity.findSubscriptionPeriods).toHaveBeenCalledWith(["s-1"]);
            expect(repository.updateSchedules).toHaveBeenCalled();
        });

        it("refuses a move onto today", async () => {
            const { service } = withOrders();

            const error = await errorOf(
                service.updateSchedules([{ id: "s-1", date: date("2026-11-03"), changeReason: "x" }]),
            );

            expect(error).toBeInstanceOf(InvalidStateError);
            expect((error as Error).message).toBe("schedule with orders can only move between future dates");
        });

        it("refuses a time change on today's schedule", async () => {
            const { service } = withOrders({ ...SCHEDULE, date: date("2026-11-03") });

            await expect(
                service.updateSchedules([{ id: "s-1", deliveryTime: time("12:00"), changeReason: "x" }]),
            ).rejects.toBeInstanceOf(InvalidStateError);
        });

        it("refuses a date outside a subscription period", async () => {
            const { service } = withOrders();

            const error = await errorOf(
                service.updateSchedules([{ id: "s-1", date: date("2026-11-16"), changeReason: "x" }]),
            );

            expect((error as Error).message).toBe("new date is outside a subscription period");
        });

        it("allows a time change without reading the periods", async () => {
            const { orderActivity, repository, service } = withOrders();

            await service.updateSchedules([{ id: "s-1", deliveryTime: time("12:00"), changeReason: "x" }]);

            expect(orderActivity.findSubscriptionPeriods).not.toHaveBeenCalled();
            expect(repository.updateSchedules).toHaveBeenCalled();
        });

        it("requires a reason once the orders are paid", async () => {
            const { service } = withOrders();

            const error = await errorOf(service.updateSchedules([{ id: "s-1", date: date("2026-11-14") }]));

            expect((error as ValidationError).issues[0]).toMatchObject({
                path: "items.0.changeReason",
                code: "change_reason_required",
            });
        });
    });

    describe("changing menus", () => {
        it("requires a reason on a schedule with paid orders", async () => {
            const { orderActivity, service } = setup();
            orderActivity.findSchedulesWithOrders.mockImplementation(async (_ids, statuses) =>
                statuses.includes("Pending") ? [] : ["s-1"],
            );

            await expect(service.updateSchedules([{ id: "s-1", primaryMenuId: "m-other" }])).rejects.toBeInstanceOf(
                ValidationError,
            );
        });

        it("needs no reason when only pending orders exist", async () => {
            const { orderActivity, repository, service } = setup();
            orderActivity.findSchedulesWithOrders.mockImplementation(async (_ids, statuses) =>
                statuses.includes("Pending") ? ["s-1"] : [],
            );

            await service.updateSchedules([{ id: "s-1", primaryMenuId: "m-other" }]);

            expect(repository.updateSchedules).toHaveBeenCalled();
        });
    });

    describe("removing the alternative", () => {
        it("gives 422 while slots use it", async () => {
            const { orderActivity, repository, service } = setup();
            orderActivity.findSchedulesUsingAlternative.mockResolvedValue(["s-1"]);

            const error = await errorOf(service.updateSchedules([{ id: "s-1", alternativeMenuId: null }]));

            expect(error).toBeInstanceOf(InvalidStateError);
            expect((error as Error).message).toBe("alternative menu is used by orders");
            expect(orderActivity.findSchedulesUsingAlternative).toHaveBeenCalledWith(["s-1"]);
            expect(repository.updateSchedules).not.toHaveBeenCalled();
        });

        it("is allowed when no slot uses it", async () => {
            const { repository, service } = setup();

            await service.updateSchedules([{ id: "s-1", alternativeMenuId: null }]);

            expect(repository.updateSchedules).toHaveBeenCalledWith([
                { id: "s-1", changes: { alternativeMenuId: null } },
            ]);
        });

        it("allows swapping it for another alternative while slots use it", async () => {
            const { orderActivity, repository, service } = setup();
            orderActivity.findSchedulesUsingAlternative.mockResolvedValue(["s-1"]);

            await service.updateSchedules([{ id: "s-1", alternativeMenuId: "m-alt-2" }]);

            expect(orderActivity.findSchedulesUsingAlternative).not.toHaveBeenCalled();
            expect(repository.updateSchedules).toHaveBeenCalled();
        });
    });
});

describe("CatalogService.updateSchedule (unit)", () => {
    it("updates one schedule with field paths and returns it", async () => {
        const { orderActivity, service } = setup();
        orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-1"]);

        const error = await errorOf(service.updateSchedule("s-1", { primaryMenuId: "m-other" }));
        expect((error as ValidationError).issues[0]?.path).toBe("changeReason");

        const updated = await service.updateSchedule("s-1", { primaryMenuId: "m-other", changeReason: "x" });
        expect(updated.id).toBe("s-1");
    });
});
