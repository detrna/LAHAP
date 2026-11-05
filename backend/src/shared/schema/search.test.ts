import { describe, expect, it } from "vitest";
import { z } from "zod";
import { searchQuerySchema } from "./search.js";

const query = z.object({ search: searchQuerySchema });

describe("searchQuerySchema", () => {
    it("trims the term", () => {
        expect(query.parse({ search: "  nasi goreng " })).toEqual({ search: "nasi goreng" });
    });

    it.each(["", "   "])("treats %j as no filter", value => {
        expect(query.parse({ search: value }).search).toBeUndefined();
    });

    it("is optional", () => {
        expect(query.parse({}).search).toBeUndefined();
    });

    it("accepts 100 characters and rejects 101", () => {
        expect(query.safeParse({ search: "a".repeat(100) }).success).toBe(true);
        expect(query.safeParse({ search: "a".repeat(101) }).success).toBe(false);
    });
});
