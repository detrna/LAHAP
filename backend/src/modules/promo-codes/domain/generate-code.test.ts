import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidCode } from "./code-format.js";
import { GENERATED_CODE_ALPHABET, GENERATED_CODE_LENGTH, generateCode } from "./generate-code.js";

describe("generateCode (unit)", () => {
    it("builds 8 characters from the random source, one call per character", () => {
        const calls: number[] = [];
        const code = generateCode(max => {
            calls.push(max);
            return calls.length - 1;
        });

        expect(code).toBe("ABCDEFGH");
        expect(calls).toEqual(Array(GENERATED_CODE_LENGTH).fill(GENERATED_CODE_ALPHABET.length));
    });

    it("can reach the first and the last character of the alphabet", () => {
        expect(generateCode(() => 0)).toBe("AAAAAAAA");
        expect(generateCode(max => max - 1)).toBe("99999999");
    });

    it("has no look-alike characters", () => {
        expect(GENERATED_CODE_ALPHABET).not.toMatch(/[01OI]/);
        expect(new Set(GENERATED_CODE_ALPHABET).size).toBe(GENERATED_CODE_ALPHABET.length);
    });

    it("always produces a valid code with the real random source", () => {
        for (let index = 0; index < 200; index++) {
            const code = generateCode(max => randomInt(max));
            expect(code).toHaveLength(GENERATED_CODE_LENGTH);
            expect(isValidCode(code)).toBe(true);
            expect(code).not.toMatch(/[01OI]/);
        }
    });
});
