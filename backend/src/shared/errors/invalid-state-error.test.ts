import { describe, expect, it } from "vitest";
import { AppError } from "./app-error.js";
import { InvalidStateError } from "./invalid-state-error.js";

describe("InvalidStateError", () => {
    it("is a 422 INVALID_STATE AppError carrying the given message", () => {
        const error = new InvalidStateError("cut-off has passed");

        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({ code: "INVALID_STATE", statusCode: 422, message: "cut-off has passed" });
        expect(error.name).toBe("InvalidStateError");
    });

    it("keeps the cause", () => {
        const cause = new Error("db");

        expect(new InvalidStateError("slot is not in Disiapkan", { cause }).cause).toBe(cause);
    });
});
