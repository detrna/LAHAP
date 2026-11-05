import { describe, expect, it } from "vitest";
import { photoKeySchema } from "./photo-key.js";

describe("photoKeySchema", () => {
    it("accepts and trims an object key", () => {
        expect(photoKeySchema.parse(" menus/2026/11/abc.webp ")).toBe("menus/2026/11/abc.webp");
    });

    it.each(["", "   ", "a".repeat(256)])("rejects %j", value => {
        expect(photoKeySchema.safeParse(value).success).toBe(false);
    });
});
