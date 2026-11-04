import { describe, expect, it } from "vitest";
import { getUniqueViolationConstraint } from "./sql-errors.js";

describe("getUniqueViolationConstraint", () => {
    it("reads the constraint from a Prisma SqlQueryError (sqlState 23505)", () => {
        expect(getUniqueViolationConstraint({ sqlState: "23505", constraint: "user_phone_key" })).toBe("user_phone_key");
    });

    it("reads the constraint from a pg DatabaseError (code 23505)", () => {
        expect(getUniqueViolationConstraint({ code: "23505", constraint: "user_email_key" })).toBe("user_email_key");
    });

    it("follows the cause chain", () => {
        const driverError = { code: "23505", constraint: "user_phone_key" };
        const wrapped = new Error("query failed", { cause: new Error("inner", { cause: driverError }) });

        expect(getUniqueViolationConstraint(wrapped)).toBe("user_phone_key");
    });

    it.each([
        ["a foreign-key violation", { sqlState: "23503", constraint: "user_allergy_allergy_id_fkey" }],
        ["a plain error", new Error("connection lost")],
        ["a non-object", "boom"],
        ["null", null],
    ])("returns null for %s", (_label, error) => {
        expect(getUniqueViolationConstraint(error)).toBeNull();
    });

    it("stops on a cyclic cause chain", () => {
        const a: { cause?: unknown } = {};
        const b = { cause: a };
        a.cause = b;

        expect(getUniqueViolationConstraint(a)).toBeNull();
    });
});
