import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { ValidationError } from "../../../../shared/errors/validation-error.js";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

const time = (value: string) => Temporal.PlainTime.from(value);
const EXISTING = buildPackageRecord({
    id: "p-1",
    deliveryTimes: [time("07:00"), time("12:00"), time("18:30")],
    photoKey: "packages/2026/11/old.webp",
});

function setup() {
    const context = setupCatalogService();
    context.repository.findPackageById.mockResolvedValue(EXISTING);
    context.repository.updatePackage.mockResolvedValue(EXISTING);
    return context;
}

describe("CatalogService.updatePackage (unit)", () => {
    it("throws PackageNotFoundError when the package is missing", async () => {
        const { repository, service } = setupCatalogService();

        await expect(service.updatePackage("missing", { name: "x" })).rejects.toBeInstanceOf(PackageNotFoundError);
        expect(repository.updatePackage).not.toHaveBeenCalled();
    });

    it("throws PackageNotFoundError when the row disappears before the update", async () => {
        const { repository, service } = setup();
        repository.updatePackage.mockResolvedValue(null);

        await expect(service.updatePackage("p-1", { name: "x" })).rejects.toBeInstanceOf(PackageNotFoundError);
    });

    it("sends only the given fields and answers with the subscriber count", async () => {
        const { repository, orderActivity, service } = setup();
        orderActivity.countActiveSubscribers.mockResolvedValue(new Map([["p-1", 4]]));

        const item = await service.updatePackage("p-1", { name: "Baru", isActive: false });

        expect(repository.updatePackage).toHaveBeenCalledWith("p-1", { name: "Baru", isActive: false }, {});
        expect(item.activeSubscriberCount).toBe(4);
    });

    it("sorts new meal times", async () => {
        const { repository, service } = setup();

        await service.updatePackage("p-1", { deliveryTimes: [time("18:30"), time("12:00"), time("07:00")] });

        expect(repository.updatePackage).toHaveBeenCalledWith(
            "p-1",
            { deliveryTimes: [time("07:00"), time("12:00"), time("18:30")] },
            {},
        );
    });

    describe("sales window", () => {
        it("checks the new end against the stored start", async () => {
            const { repository, service } = setup();

            const error = await service
                .updatePackage("p-1", { endAt: EXISTING.startAt })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(ValidationError);
            expect(repository.updatePackage).not.toHaveBeenCalled();
        });

        it("checks the new start against the stored end", async () => {
            const { repository, service } = setup();
            repository.findPackageById.mockResolvedValue({
                ...EXISTING,
                endAt: Temporal.PlainDateTime.from("2026-12-01T00:00:00"),
            });

            await expect(
                service.updatePackage("p-1", { startAt: Temporal.PlainDateTime.from("2026-12-01T00:00:00") }),
            ).rejects.toBeInstanceOf(ValidationError);
        });

        it("accepts clearing the end", async () => {
            const { repository, service } = setup();

            await service.updatePackage("p-1", { endAt: null });

            expect(repository.updatePackage).toHaveBeenCalledWith("p-1", { endAt: null }, {});
        });
    });

    describe("photo", () => {
        it("checks a new key", async () => {
            const { photoKeys, service } = setup();

            await service.updatePackage("p-1", { photoKey: "packages/2026/11/new.webp" });

            expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("packages/2026/11/new.webp");
        });

        it("skips the check when the key is the stored one", async () => {
            const { photoKeys, service } = setup();

            await service.updatePackage("p-1", { photoKey: "packages/2026/11/old.webp" });

            expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
        });
    });

    describe("removing meal times", () => {
        const TODAY = Temporal.PlainDate.from("2026-11-03");

        it("does not look at schedules when no time is dropped", async () => {
            const { repository, service } = setup();

            await service.updatePackage("p-1", { deliveryTimes: [...EXISTING.deliveryTimes, time("20:00")] });

            expect(repository.findScheduleIdsAtTimes).not.toHaveBeenCalled();
        });

        it("deletes the schedules at the dropped times from today on when none has orders", async () => {
            const { repository, orderActivity, service } = setup();
            repository.findScheduleIdsAtTimes.mockResolvedValue(["s-1", "s-2"]);

            await service.updatePackage("p-1", { deliveryTimes: [time("07:00"), time("12:00")] });

            expect(repository.findScheduleIdsAtTimes).toHaveBeenCalledWith("p-1", {
                times: [time("18:30")],
                from: TODAY,
            });
            expect(orderActivity.findSchedulesWithOrders).toHaveBeenCalledWith(["s-1", "s-2"], ["Pending", "Success"]);
            expect(orderActivity.deleteInactiveSlots).toHaveBeenCalledWith(["s-1", "s-2"]);
            expect(repository.updatePackage).toHaveBeenCalledWith(
                "p-1",
                { deliveryTimes: [time("07:00"), time("12:00")] },
                { deleteSchedulesAt: { times: [time("18:30")], from: TODAY } },
            );
        });

        it("still passes the removal when no schedule exists at the dropped time", async () => {
            const { repository, orderActivity, service } = setup();

            await service.updatePackage("p-1", { deliveryTimes: [time("07:00"), time("12:00")] });

            expect(orderActivity.findSchedulesWithOrders).not.toHaveBeenCalled();
            expect(repository.updatePackage).toHaveBeenCalledWith(
                "p-1",
                expect.anything(),
                expect.objectContaining({ deleteSchedulesAt: expect.anything() }),
            );
        });

        it("refuses with 422 when a schedule at a dropped time has pending or paid orders", async () => {
            const { repository, orderActivity, service } = setup();
            repository.findScheduleIdsAtTimes.mockResolvedValue(["s-1", "s-2"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-2"]);

            const error = await service
                .updatePackage("p-1", { deliveryTimes: [time("07:00"), time("12:00")] })
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(InvalidStateError);
            expect((error as InvalidStateError).message).toBe("meal time is still used by schedules with orders");
            expect(orderActivity.deleteInactiveSlots).not.toHaveBeenCalled();
            expect(repository.updatePackage).not.toHaveBeenCalled();
        });
    });

    describe("renaming meal times", () => {
        const TOMORROW = Temporal.PlainDate.from("2026-11-04");
        const RENAME = [{ from: time("12:00"), to: time("12:30") }];

        it("replaces the time and moves the schedules from tomorrow on", async () => {
            const { repository, orderActivity, service } = setup();
            repository.findScheduleIdsAtTimes.mockResolvedValue(["s-1"]);

            await service.updatePackage("p-1", { deliveryTimeChanges: RENAME });

            expect(repository.findScheduleIdsAtTimes).toHaveBeenCalledWith("p-1", {
                times: [time("12:00")],
                from: TOMORROW,
            });
            expect(orderActivity.findSchedulesWithOrders).toHaveBeenCalledWith(["s-1"], ["Success"]);
            expect(repository.updatePackage).toHaveBeenCalledWith(
                "p-1",
                { deliveryTimes: [time("07:00"), time("12:30"), time("18:30")] },
                { moveSchedulesAt: { changes: RENAME, from: TOMORROW } },
            );
        });

        it("requires a change reason when a moved schedule has paid orders", async () => {
            const { repository, orderActivity, service } = setup();
            repository.findScheduleIdsAtTimes.mockResolvedValue(["s-1"]);
            orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-1"]);

            const error = await service
                .updatePackage("p-1", { deliveryTimeChanges: RENAME })
                .catch((caught: unknown) => caught);
            expect((error as ValidationError).issues[0]).toMatchObject({
                path: "changeReason",
                code: "change_reason_required",
            });

            await service.updatePackage("p-1", { deliveryTimeChanges: RENAME, changeReason: "jam baru" });
            expect(repository.updatePackage).toHaveBeenCalledTimes(1);
        });

        it("refuses a time the package doesn't have, or a target it already has", async () => {
            const { repository, service } = setup();

            const error = await service
                .updatePackage("p-1", {
                    deliveryTimeChanges: [
                        { from: time("09:00"), to: time("09:30") },
                        { from: time("07:00"), to: time("18:30") },
                    ],
                })
                .catch((caught: unknown) => caught);

            expect((error as ValidationError).issues.map(issue => [issue.path, issue.code])).toEqual([
                ["deliveryTimeChanges.0.from", "unknown_delivery_time"],
                ["deliveryTimeChanges.1.to", "delivery_time_exists"],
            ]);
            expect(repository.updatePackage).not.toHaveBeenCalled();
        });
    });
});
