import { describe, expect, it } from "vitest";
import { createMockOrdersRepository } from "../test-utils/mocks/orders.mocks.js";
import { OrdersService } from "./orders.service.js";

describe("OrdersService.findLastSuccessEndDates (unit)", () => {
    it("asks the repository once per distinct user", async () => {
        const repository = createMockOrdersRepository();
        const dates = new Map([["a", Temporal.PlainDate.from("2026-11-01")]]);
        repository.findLastSuccessEndDates.mockResolvedValue(dates);

        expect(await new OrdersService(repository).findLastSuccessEndDates(["a", "b", "a"])).toBe(dates);
        expect(repository.findLastSuccessEndDates).toHaveBeenCalledWith(["a", "b"]);
    });

    it("skips the repository for no users", async () => {
        const repository = createMockOrdersRepository();

        expect((await new OrdersService(repository).findLastSuccessEndDates([])).size).toBe(0);
        expect(repository.findLastSuccessEndDates).not.toHaveBeenCalled();
    });
});
