import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.countPortionsBySchedule (unit)", () => {
    it("counts the paid, not skipped portions of each schedule", async () => {
        const { service, repository } = setupOrdersService();
        repository.countPortions.mockResolvedValue([{ menuScheduleId: "s-1", usesAlternativeMenu: true, portions: 4 }]);

        expect(await service.countPortionsBySchedule(["s-1", "s-1"])).toEqual([
            { scheduleId: "s-1", usesAlternativeMenu: true, portions: 4 },
        ]);
        expect(repository.countPortions).toHaveBeenCalledWith({
            menuScheduleIds: ["s-1"],
            statuses: ["Terjadwal", "Disiapkan", "Diantar", "Siap Diambil", "Selesai"],
            subscriptionStatuses: ["Success"],
        });
        expect(await service.countPortionsBySchedule([])).toEqual([]);
    });
});
