import { describe, expect, it } from "vitest";
import { buildObjectKey } from "./object-key.js";

const id = "3f2b6c1e-8a4d-4e5f-9b7c-2d1e0f3a4b5c";
const date = Temporal.PlainDate.from("2026-11-05");

describe("buildObjectKey", () => {
    it.each([
        ["image/jpeg", "jpg"],
        ["image/png", "png"],
        ["image/webp", "webp"],
    ])("names a %s upload <folder>/<YYYY>/<MM>/<id>.%s", (contentType, extension) => {
        expect(buildObjectKey({ folder: "menus", date, id, contentType })).toBe(`menus/2026/11/${id}.${extension}`);
    });

    it("pads single-digit months", () => {
        const key = buildObjectKey({
            folder: "obstacles",
            date: Temporal.PlainDate.from("2027-01-31"),
            id,
            contentType: "image/png",
        });

        expect(key).toBe(`obstacles/2027/01/${id}.png`);
    });

    it("refuses a type the upload middleware never lets through", () => {
        expect(() => buildObjectKey({ folder: "menus", date, id, contentType: "image/gif" })).toThrow(
            "unsupported content type: image/gif",
        );
    });
});
