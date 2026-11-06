import { describe, expect, it } from "vitest";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { MenuScheduleNotFoundError, ScheduleInUseError } from "../interfaces/catalog.repository.js";

describe("CatalogService.deleteSchedules (unit)", () => {
    it("drops the inactive slots, then deletes the schedules", async () => {
        const { orderActivity, repository, service } = setupCatalogService();
        repository.deleteSchedules.mockResolvedValue(2);

        expect(await service.deleteSchedules(["s-1", "s-2"])).toEqual({ deletedCount: 2 });
        expect(orderActivity.findSchedulesWithOrders).toHaveBeenCalledWith(["s-1", "s-2"], ["Pending", "Success"]);
        expect(orderActivity.deleteInactiveSlots).toHaveBeenCalledWith(["s-1", "s-2"]);
        expect(repository.deleteSchedules).toHaveBeenCalledWith(["s-1", "s-2"]);
    });

    it("throws MenuScheduleNotFoundError for an unknown id", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMissingScheduleIds.mockResolvedValue(["s-9"]);

        await expect(service.deleteSchedules(["s-1", "s-9"])).rejects.toBeInstanceOf(MenuScheduleNotFoundError);
        expect(repository.deleteSchedules).not.toHaveBeenCalled();
    });

    it("throws ScheduleInUseError while a schedule has active orders, deleting nothing", async () => {
        const { orderActivity, repository, service } = setupCatalogService();
        orderActivity.findSchedulesWithOrders.mockResolvedValue(["s-2"]);

        await expect(service.deleteSchedules(["s-1", "s-2"])).rejects.toBeInstanceOf(ScheduleInUseError);
        expect(orderActivity.deleteInactiveSlots).not.toHaveBeenCalled();
        expect(repository.deleteSchedules).not.toHaveBeenCalled();
    });
});
