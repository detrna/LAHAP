import { describe, expect, it } from "vitest";
import { findSqlError, getForeignKeyViolationConstraint, getUniqueViolationConstraint } from "./sql-errors.js";

describe("getUniqueViolationConstraint", () => {
    it("reads the constraint from a Prisma SqlQueryError (sqlState 23505)", () => {
        expect(getUniqueViolationConstraint({ sqlState: "23505", constraint: "user_phone_key" })).toBe(
            "user_phone_key",
        );
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

describe("getForeignKeyViolationConstraint", () => {
    it("returns the constraint of a foreign key violation nested in the cause chain", () => {
        const error = new Error("orm failed", {
            cause: { sqlState: "23503", constraint: "menu_ingredient_ingredient_id_fkey" },
        });

        expect(getForeignKeyViolationConstraint(error)).toBe("menu_ingredient_ingredient_id_fkey");
    });

    it("returns null for a unique violation", () => {
        expect(getForeignKeyViolationConstraint({ code: "23505", constraint: "user_phone_key" })).toBeNull();
    });
});

describe("findSqlError", () => {
    it("returns the first error in the cause chain with the given SQLSTATE", () => {
        const pgError = { code: "23503", constraint: "order_menu_schedule_id_fkey", detail: "Key is still referenced" };

        expect(findSqlError(new Error("wrapper", { cause: pgError }), "23503")).toBe(pgError);
    });

    it("returns null when no error carries that SQLSTATE", () => {
        expect(findSqlError(new Error("plain"), "23503")).toBeNull();
    });
});
