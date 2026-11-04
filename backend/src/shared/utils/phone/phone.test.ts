import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../../errors/app-error.js";
import { InvalidPhoneNumberError, isNormalizedPhone, normalizePhone, phoneSchema } from "./phone.js";

describe("normalizePhone", () => {
    it.each([
        ["081234567890", "6281234567890"],
        ["+6281234567890", "6281234567890"],
        ["6281234567890", "6281234567890"],
        ["81234567890", "6281234567890"],
        ["0812-3456-7890", "6281234567890"],
        [" +62 812 3456 7890 ", "6281234567890"],
        ["(0341) 551234", "62341551234"],
        ["0812.3456.789", "628123456789"],
    ])("normalizes %j to %j", (raw, expected) => {
        expect(normalizePhone(raw)).toBe(expected);
    });

    it("is idempotent", () => {
        const once = normalizePhone("0812-3456-7890");
        expect(normalizePhone(once)).toBe(once);
    });

    it.each([
        ["an empty string", ""],
        ["letters", "0812abc4567"],
        ["a foreign number", "+14155552671"],
        ["too short", "08123"],
        ["too long", "0812345678901234"],
        ["an international 00 prefix", "006281234567890"],
        ["62 followed by 0", "62081234567890"],
        ["a number without a known prefix", "1234567890"],
    ])("rejects %s", (_label, raw) => {
        expect(() => normalizePhone(raw)).toThrow(InvalidPhoneNumberError);
    });

    it("throws an AppError with a 400 status and INVALID_PHONE_NUMBER code", () => {
        try {
            normalizePhone("+14155552671");
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error).toMatchObject({ statusCode: 400, code: "INVALID_PHONE_NUMBER" });
        }
    });
});

describe("isNormalizedPhone", () => {
    it("accepts only the stored 62… form", () => {
        expect(isNormalizedPhone("6281234567890")).toBe(true);
        expect(isNormalizedPhone("081234567890")).toBe(false);
        expect(isNormalizedPhone("+6281234567890")).toBe(false);
    });
});

describe("phoneSchema", () => {
    it("normalizes any accepted form", () => {
        expect(phoneSchema.parse("0812-3456-7890")).toBe("6281234567890");
        expect(phoneSchema.parse("+6281234567890")).toBe("6281234567890");
    });

    it("reports an invalid number as a Zod issue instead of throwing an AppError", () => {
        const result = z.object({ phone: phoneSchema }).safeParse({ phone: "+14155552671" });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ["phone"],
                message: "must be an Indonesian number like 0812…, +62812… or 62812…",
            }),
        ]);
    });

    it("rejects non-strings", () => {
        expect(phoneSchema.safeParse(6281234567890).success).toBe(false);
    });
});
