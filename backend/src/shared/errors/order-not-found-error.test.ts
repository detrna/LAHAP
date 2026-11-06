import { describe, expect, it } from "vitest";
import { OrderNotFoundError } from "./order-not-found-error.js";

describe("OrderNotFoundError", () => {
    it("is a 404 ORDER_NOT_FOUND", () => {
        expect(new OrderNotFoundError()).toMatchObject({
            code: "ORDER_NOT_FOUND",
            statusCode: 404,
            message: "order not found",
        });
    });
});
