import { describe, expect, it } from "vitest";
import { z } from "zod";
import { queryBooleanSchema } from "./query-boolean.js";

describe("queryBooleanSchema", () => {
    it("reads 'true' and 'false' as booleans", () => {
        expect(queryBooleanSchema.parse("true")).toBe(true);
        expect(queryBooleanSchema.parse("false")).toBe(false);
    });

    it.each(["1", "0", "yes", "", "TRUE", "False", " true"])("rejects %j", value => {
        expect(queryBooleanSchema.safeParse(value).success).toBe(false);
    });

    it("leaves the filter out when the query has no value and the field is optional", () => {
        expect(z.object({ isActive: queryBooleanSchema.optional() }).parse({})).toEqual({});
    });
});
