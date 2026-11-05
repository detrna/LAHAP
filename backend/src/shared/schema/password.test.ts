import { describe, expect, it } from "vitest";
import { passwordSchema } from "./password.js";

describe("passwordSchema", () => {
    it("accepts 8 to 72 characters", () => {
        expect(passwordSchema.safeParse("a".repeat(8)).success).toBe(true);
        expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
    });

    it("rejects fewer than 8 or more than 72 characters", () => {
        expect(passwordSchema.safeParse("a".repeat(7)).success).toBe(false);
        expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
    });

    it("rejects a password over 72 bytes even when it has at most 72 characters", () => {
        const result = passwordSchema.safeParse("é".repeat(37));

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("must be at most 72 bytes");
    });
});
