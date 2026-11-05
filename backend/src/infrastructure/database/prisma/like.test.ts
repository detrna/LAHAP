import { describe, expect, it } from "vitest";
import { escapeLikePattern, toContainsPattern } from "./like.js";

describe("escapeLikePattern", () => {
    it.each([
        ["50%", "50\\%"],
        ["a_b", "a\\_b"],
        ["c:\\temp", "c:\\\\temp"],
        ["nasi goreng", "nasi goreng"],
    ])("escapes %j as %j", (term, expected) => {
        expect(escapeLikePattern(term)).toBe(expected);
    });
});

describe("toContainsPattern", () => {
    it("wraps the escaped term in wildcards", () => {
        expect(toContainsPattern("50%_off")).toBe("%50\\%\\_off%");
    });
});
