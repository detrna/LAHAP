import { describe, expect, it } from "vitest";
import { ValidationError } from "./validation-error.js";

describe("ValidationError", () => {
    it("is a 400 VALIDATION_ERROR whose message summarizes its issues", () => {
        const error = new ValidationError([
            { target: "query", path: "to", message: "must not be before from", code: "custom" },
            { target: "body", path: "", message: "is required", code: "invalid_type" },
        ]);

        expect(error).toMatchObject({ code: "VALIDATION_ERROR", statusCode: 400 });
        expect(error.message).toBe("request validation failed: query.to: must not be before from; body: is required");
    });

    it("has a plain message without issues", () => {
        expect(new ValidationError([]).message).toBe("request validation failed");
    });
});
