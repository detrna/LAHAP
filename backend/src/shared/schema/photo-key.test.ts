import { describe, expect, it } from "vitest";
import { photoKeyIn, photoKeySchema } from "./photo-key.js";

describe("photoKeySchema", () => {
    it("accepts and trims an object key", () => {
        expect(photoKeySchema.parse(" menus/2026/11/abc.webp ")).toBe("menus/2026/11/abc.webp");
    });

    it.each(["", "   ", "a".repeat(256)])("rejects %j", value => {
        expect(photoKeySchema.safeParse(value).success).toBe(false);
    });
});

describe("photoKeyIn", () => {
    const menuPhoto = photoKeyIn("menus");

    it("accepts a trimmed key in the folder", () => {
        expect(menuPhoto.parse(" menus/2026/11/abc.webp ")).toBe("menus/2026/11/abc.webp");
        expect(menuPhoto.parse("menus/seed/abc.webp")).toBe("menus/seed/abc.webp");
    });

    it.each([
        "packages/2026/11/abc.webp",
        "menusx/2026/11/abc.webp",
        "menus",
        "menus/",
        "/menus/2026/11/abc.webp",
        "menus//abc.webp",
        "menus/../tiers/abc.webp",
        "menus/./abc.webp",
    ])("rejects %j", value => {
        const result = menuPhoto.safeParse(value);

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe('must be a key in the "menus" folder');
    });

    it("keeps the length limit", () => {
        expect(menuPhoto.safeParse(`menus/${"a".repeat(250)}`).success).toBe(false);
    });
});
