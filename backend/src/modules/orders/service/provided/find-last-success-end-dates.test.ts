import { describe, expect, it } from "vitest";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.findLastSuccessEndDates (unit)", () => {
    it("asks the repository once per distinct user", async () => {
        const { repository, service } = setupOrdersService();
        const dates = new Map([["a", Temporal.PlainDate.from("2026-11-01")]]);
        repository.findLastSuccessEndDates.mockResolvedValue(dates);

        expect(await service.findLastSuccessEndDates(["a", "b", "a"])).toBe(dates);
        expect(repository.findLastSuccessEndDates).toHaveBeenCalledWith(["a", "b"]);
    });

    it("skips the repository for no users", async () => {
        const { repository, service } = setupOrdersService();

        expect((await service.findLastSuccessEndDates([])).size).toBe(0);
        expect(repository.findLastSuccessEndDates).not.toHaveBeenCalled();
    });
});
