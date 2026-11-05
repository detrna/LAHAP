import { describe, expect, it } from "vitest";
import { z } from "zod";
import { uniqueArray } from "./unique-array.js";

describe("uniqueArray", () => {
    const ids = uniqueArray(z.string());

    it("accepts distinct values and an empty array", () => {
        expect(ids.parse(["a", "b"])).toEqual(["a", "b"]);
        expect(ids.parse([])).toEqual([]);
    });

    it("rejects duplicates with an issue on the array itself", () => {
        const result = ids.safeParse(["a", "b", "a"]);

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], message: "must not contain duplicates" }),
        ]);
    });

    it("compares objects by the given key", () => {
        const lines = uniqueArray(z.object({ ingredientId: z.string(), quantity: z.number() }), {
            by: line => line.ingredientId,
        });

        expect(
            lines.safeParse([
                { ingredientId: "x", quantity: 1 },
                { ingredientId: "y", quantity: 1 },
            ]).success,
        ).toBe(true);
        expect(
            lines.safeParse([
                { ingredientId: "x", quantity: 1 },
                { ingredientId: "x", quantity: 2 },
            ]).success,
        ).toBe(false);
    });

    it("checks duplicates after the item schema has transformed the values", () => {
        expect(uniqueArray(z.string().trim()).safeParse(["a", " a "]).success).toBe(false);
    });

    it("keeps array checks such as min chained after it", () => {
        expect(uniqueArray(z.string()).min(1).safeParse([]).success).toBe(false);
    });
});
