import { describe, expect, it } from "vitest";
import { isValidCode, normalizeCode } from "./code-format.js";

describe("normalizeCode (unit)", () => {
    it("trims and uppercases", () => {
        expect(normalizeCode("  merdeka ")).toBe("MERDEKA");
        expect(normalizeCode("Hemat-20_a")).toBe("HEMAT-20_A");
    });
});

describe("isValidCode (unit)", () => {
    it.each(["MERDEKA", "HEMAT-20", "A_B", "X", "A".repeat(50)])("accepts %s", code => {
        expect(isValidCode(code)).toBe(true);
    });

    it.each(["", "HEMAT 20", "HEMAT.20", "merdeka", "KODE!", "A".repeat(51), "PROMO\n"])("rejects %j", code => {
        expect(isValidCode(code)).toBe(false);
    });
});
