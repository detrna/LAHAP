import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.countActiveSubscribers (unit)", () => {
    const today = Temporal.PlainDate.from("2026-11-09");

    it("counts the customers with a paid order that has not ended", async () => {
        const { service, repository } = setupOrdersService();
        repository.countActiveSubscribers.mockResolvedValue(new Map([["p-1", 3]]));

        expect(await service.countActiveSubscribers(["p-1", "p-1"], today)).toEqual(new Map([["p-1", 3]]));
        expect(repository.countActiveSubscribers).toHaveBeenCalledWith({
            packageIds: ["p-1"],
            subscriptionStatuses: ["Success"],
            endDateFrom: today,
        });
    });

    it("answers an empty map without a query when there are no packages", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.countActiveSubscribers([], today)).toEqual(new Map());
        expect(repository.countActiveSubscribers).not.toHaveBeenCalled();
    });
});

describe("OrdersService.findSchedulesWithOrders (unit)", () => {
    it("asks for the distinct schedules with slots from subscriptions in the given statuses", async () => {
        const { service, repository } = setupOrdersService();
        repository.findScheduleIdsWithSlots.mockResolvedValue(["s-1"]);

        expect(await service.findSchedulesWithOrders(["s-1", "s-2", "s-1"], ["Pending", "Success"])).toEqual(["s-1"]);
        expect(repository.findScheduleIdsWithSlots).toHaveBeenCalledWith(["s-1", "s-2"], ["Pending", "Success"]);
    });

    it("answers nothing without a query when there are no schedules or no statuses", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.findSchedulesWithOrders([], ["Success"])).toEqual([]);
        expect(await service.findSchedulesWithOrders(["s-1"], [])).toEqual([]);
        expect(repository.findScheduleIdsWithSlots).not.toHaveBeenCalled();
    });
});

describe("OrdersService.findSchedulesUsingAlternative (unit)", () => {
    it("looks only at slots of paid subscriptions", async () => {
        const { service, repository } = setupOrdersService();
        repository.findScheduleIdsUsingAlternative.mockResolvedValue(["s-2"]);

        expect(await service.findSchedulesUsingAlternative(["s-2", "s-2", "s-3"])).toEqual(["s-2"]);
        expect(repository.findScheduleIdsUsingAlternative).toHaveBeenCalledWith(["s-2", "s-3"], ["Success"]);
    });

    it("answers nothing without a query when there are no schedules", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.findSchedulesUsingAlternative([])).toEqual([]);
        expect(repository.findScheduleIdsUsingAlternative).not.toHaveBeenCalled();
    });
});

describe("OrdersService.findSubscriptionPeriods (unit)", () => {
    it("returns the period of each pending or paid subscription that has slots on the schedules", async () => {
        const { service, repository } = setupOrdersService();
        const periods = [
            {
                scheduleId: "s-1",
                startDate: Temporal.PlainDate.from("2026-11-10"),
                endDate: Temporal.PlainDate.from("2026-11-16"),
            },
        ];
        repository.findSubscriptionPeriods.mockResolvedValue(periods);

        expect(await service.findSubscriptionPeriods(["s-1", "s-1"])).toEqual(periods);
        expect(repository.findSubscriptionPeriods).toHaveBeenCalledWith(["s-1"], ["Pending", "Success"]);
    });

    it("answers nothing without a query when there are no schedules", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.findSubscriptionPeriods([])).toEqual([]);
        expect(repository.findSubscriptionPeriods).not.toHaveBeenCalled();
    });
});

describe("OrdersService.deleteInactiveSlots (unit)", () => {
    it("deletes the slots of expired and cancelled subscriptions", async () => {
        const { service, repository } = setupOrdersService();

        await service.deleteInactiveSlots(["s-1", "s-1", "s-2"]);

        expect(repository.deleteSlotsOfSubscriptions).toHaveBeenCalledWith(["s-1", "s-2"], ["Expire", "Dibatalkan"]);
    });

    it("does nothing when there are no schedules", async () => {
        const { service, repository } = setupOrdersService();

        await service.deleteInactiveSlots([]);

        expect(repository.deleteSlotsOfSubscriptions).not.toHaveBeenCalled();
    });
});
