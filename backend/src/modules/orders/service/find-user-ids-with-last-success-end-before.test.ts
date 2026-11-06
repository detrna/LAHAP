import { describe, expect, it } from "vitest";
import { createMockOrdersRepository } from "../test-utils/mocks/orders.mocks.js";
import { OrdersService } from "./orders.service.js";

describe("OrdersService.findUserIdsWithLastSuccessEndBefore (unit)", () => {
    it("passes the date to the repository", async () => {
        const repository = createMockOrdersRepository();
        repository.findUserIdsWithLastSuccessEndBefore.mockResolvedValue(["a"]);
        const date = Temporal.PlainDate.from("2026-10-20");

        expect(await new OrdersService(repository).findUserIdsWithLastSuccessEndBefore(date)).toEqual(["a"]);
        expect(repository.findUserIdsWithLastSuccessEndBefore).toHaveBeenCalledWith(date);
    });
});
