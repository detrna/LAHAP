import { describe, expect, it } from "vitest";
import { AppError } from "./app-error.js";
import { UnknownAllergyError } from "./unknown-allergy-error.js";

describe("UnknownAllergyError", () => {
    it("is a 400 UNKNOWN_ALLERGY AppError naming the ids", () => {
        const error = new UnknownAllergyError(["a-1", "a-2"]);

        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({
            code: "UNKNOWN_ALLERGY",
            statusCode: 400,
            message: "unknown allergy ids: a-1, a-2",
            allergyIds: ["a-1", "a-2"],
        });
    });
});
