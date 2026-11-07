import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.findCustomerIdsForPackage (unit)", () => {
    it("asks for customers with a paid subscription on the package that has not ended", async () => {
        const { service, repository } = setupOrdersService();
        const today = Temporal.PlainDate.from("2026-11-09");
        repository.findCustomerIdsByPackage.mockResolvedValue(["u-1", "u-2"]);

        expect(await service.findCustomerIdsForPackage("p-1", today)).toEqual(["u-1", "u-2"]);
        expect(repository.findCustomerIdsByPackage).toHaveBeenCalledWith({
            packageId: "p-1",
            subscriptionStatuses: ["Success"],
            endDateFrom: today,
        });
    });
});

describe("OrdersService.findCustomerIdsForSchedule (unit)", () => {
    it("asks for customers with a paid subscription and a slot on the schedule that is not skipped", async () => {
        const { service, repository } = setupOrdersService();
        repository.findCustomerIdsBySchedule.mockResolvedValue(["u-3"]);

        expect(await service.findCustomerIdsForSchedule("s-1")).toEqual(["u-3"]);
        expect(repository.findCustomerIdsBySchedule).toHaveBeenCalledWith({
            scheduleId: "s-1",
            subscriptionStatuses: ["Success"],
            excludedSlotStatuses: ["Dilewati"],
        });
    });
});

describe("OrdersService.findAnnouncementTargetsOf (unit)", () => {
    it("applies the same rules in reverse for one customer", async () => {
        const { service, repository } = setupOrdersService();
        const today = Temporal.PlainDate.from("2026-11-09");
        repository.findAnnouncementTargets.mockResolvedValue({ packageIds: ["p-1"], scheduleIds: ["s-1", "s-2"] });

        expect(await service.findAnnouncementTargetsOf("u-1", today)).toEqual({
            packageIds: ["p-1"],
            scheduleIds: ["s-1", "s-2"],
        });
        expect(repository.findAnnouncementTargets).toHaveBeenCalledWith({
            userId: "u-1",
            subscriptionStatuses: ["Success"],
            packageEndDateFrom: today,
            excludedSlotStatuses: ["Dilewati"],
        });
    });
});
