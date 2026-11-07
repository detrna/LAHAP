import { describe, expect, it } from "vitest";
import { deliveryListQuerySchema, obstacleCreateSchema, orderIdParamsSchema } from "./delivery.schemas.js";

describe("deliveryListQuerySchema (unit)", () => {
    it("accepts an empty query so the date defaults to today", () => {
        expect(deliveryListQuerySchema.parse({})).toEqual({});
    });

    it("parses the date", () => {
        expect(deliveryListQuerySchema.parse({ date: "2026-11-09" }).date?.toString()).toBe("2026-11-09");
    });

    it.each(["09-11-2026", "2026-02-30", "tomorrow"])("rejects the date %s", date => {
        expect(deliveryListQuerySchema.safeParse({ date }).success).toBe(false);
    });
});

describe("obstacleCreateSchema (unit)", () => {
    it("trims the note and accepts a photo key in the obstacles folder", () => {
        expect(
            obstacleCreateSchema.parse({ note: "  Gerbang terkunci  ", photoKey: "obstacles/2026/11/a.webp" }),
        ).toEqual({
            note: "Gerbang terkunci",
            photoKey: "obstacles/2026/11/a.webp",
        });
    });

    it("does not need a photo", () => {
        expect(obstacleCreateSchema.parse({ note: "Hujan" })).toEqual({ note: "Hujan" });
    });

    it("accepts a note of exactly 1000 characters", () => {
        expect(obstacleCreateSchema.safeParse({ note: "a".repeat(1000) }).success).toBe(true);
    });

    it.each([
        ["a missing note", {}],
        ["an empty note", { note: "" }],
        ["a blank note", { note: "   " }],
        ["a note over 1000 characters", { note: "a".repeat(1001) }],
        ["a photo key outside the obstacles folder", { note: "x", photoKey: "menus/2026/11/a.webp" }],
        ["a photo key with a parent segment", { note: "x", photoKey: "obstacles/../a.webp" }],
    ])("rejects %s", (_, body) => {
        expect(obstacleCreateSchema.safeParse(body).success).toBe(false);
    });
});

describe("orderIdParamsSchema (unit)", () => {
    it("needs a uuid", () => {
        expect(orderIdParamsSchema.safeParse({ id: "00000000-0000-4000-8000-000000000001" }).success).toBe(true);
        expect(orderIdParamsSchema.safeParse({ id: "o-1" }).success).toBe(false);
    });
});
