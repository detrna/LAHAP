import { describe, expect, it } from "vitest";
import { buildScheduleSummary } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.prepareDueSlots (unit)", () => {
    it("moves only the slots whose meal time is within the lead time", async () => {
        const { service, repository, catalog } = setupOrdersService("2026-11-10T09:30:00+07:00[Asia/Jakarta]");
        const subscription = buildSubscriptionRecord({ status: "Success" });
        const today = Temporal.PlainDate.from("2026-11-10");
        repository.findSlots.mockResolvedValue([
            { order: buildOrderRecord({ id: "lunch", menuScheduleId: "s-lunch", serviceDate: today }), subscription },
            { order: buildOrderRecord({ id: "dinner", menuScheduleId: "s-dinner", serviceDate: today }), subscription },
        ]);
        catalog.findSchedules.mockResolvedValue([
            buildScheduleSummary({ id: "s-lunch", deliveryTime: { time: "12:00", range: "Siang" } }),
            buildScheduleSummary({ id: "s-dinner", deliveryTime: { time: "18:00", range: "Malam" } }),
        ]);

        await service.prepareDueSlots(180);

        expect(repository.findSlots).toHaveBeenCalledWith({
            statuses: ["Terjadwal"],
            serviceDateFrom: today,
            serviceDateTo: today,
            subscriptionStatuses: ["Success"],
        });
        expect(repository.transitionSlots).toHaveBeenCalledWith({
            orderIds: ["lunch"],
            from: ["Terjadwal"],
            to: "Disiapkan",
            actorId: null,
        });
    });

    it("does nothing without candidate slots", async () => {
        const { service, catalog } = setupOrdersService();

        expect(await service.prepareDueSlots(180)).toEqual({ preparedCount: 0 });
        expect(catalog.findSchedules).not.toHaveBeenCalled();
    });
});
