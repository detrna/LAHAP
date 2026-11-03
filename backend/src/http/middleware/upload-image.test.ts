import { describe, expect, it } from "vitest";
import { detectImageType } from "./upload-image.js";

const bytes = (...values: number[]) => Uint8Array.from(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("detectImageType", () => {
    it("detects JPEG", () => {
        expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe("image/jpeg");
    });

    it("detects PNG", () => {
        expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe("image/png");
    });

    it("detects WebP (RIFF container with a WEBP form type)", () => {
        expect(detectImageType(text("RIFF\x24\x00\x00\x00WEBPVP8 "))).toBe("image/webp");
    });

    it.each([
        ["plain text", text("hello, this is not an image")],
        ["an SVG", text("<svg xmlns='http://www.w3.org/2000/svg'></svg>")],
        ["a RIFF that is not WebP (WAV)", text("RIFF\x24\x00\x00\x00WAVEfmt ")],
        ["a GIF", text("GIF89a")],
        ["a PDF", text("%PDF-1.7")],
        ["a truncated PNG signature", bytes(0x89, 0x50, 0x4e)],
        ["an empty file", bytes()],
    ])("returns null for %s", (_label, input) => {
        expect(detectImageType(input)).toBeNull();
    });
});
