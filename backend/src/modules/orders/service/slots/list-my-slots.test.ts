import { describe, expect, it } from "vitest";
import { buildMenuSchedule } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.listMySlots (unit)", () => {
    it("lists the day's paid slots by meal time, today by default", async () => {
        const { service, repository, catalog } = setupOrdersService("2026-11-10T08:00:00+07:00[Asia/Jakarta]");
        const subscription = buildSubscriptionRecord({ status: "Success" });
        repository.findCustomerSlots.mockResolvedValue([
            { order: buildOrderRecord({ id: "dinner", menuScheduleId: "s-2" }), subscription },
            { order: buildOrderRecord({ id: "breakfast", menuScheduleId: "s-1" }), subscription },
        ]);
        catalog.getSchedulesByIds.mockResolvedValue([
            buildMenuSchedule({ id: "s-1", deliveryTime: { time: "07:00", range: "Pagi" } }),
            buildMenuSchedule({ id: "s-2", deliveryTime: { time: "18:00", range: "Malam" } }),
        ]);

        const slots = await service.listMySlots("user-1", undefined);

        expect(repository.findCustomerSlots).toHaveBeenCalledWith({
            userId: "user-1",
            date: Temporal.PlainDate.from("2026-11-10"),
            subscriptionStatuses: ["Success"],
        });
        expect(slots.map(slot => slot.id)).toEqual(["breakfast", "dinner"]);
    });
});
