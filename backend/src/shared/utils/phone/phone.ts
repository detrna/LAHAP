import { z } from "zod";
import { InvalidPhoneNumberError } from "./errors.js";

export * from "./errors.js";

const SEPARATORS = /[\s\-.()]/g;
const NORMALIZED_PHONE = /^62[1-9]\d{7,12}$/;

export function normalizePhone(raw: string): string {
    let digits = raw.replace(SEPARATORS, "");

    if (digits.startsWith("+")) {
        if (!digits.startsWith("+62")) {
            throw new InvalidPhoneNumberError("only Indonesian (+62) phone numbers are supported");
        }
        digits = digits.slice(1);
    } else if (digits.startsWith("0")) {
        digits = `62${digits.slice(1)}`;
    } else if (digits.startsWith("8")) {
        digits = `62${digits}`;
    }

    if (!NORMALIZED_PHONE.test(digits)) {
        throw new InvalidPhoneNumberError();
    }
    return digits;
}

export function isNormalizedPhone(value: string): boolean {
    return NORMALIZED_PHONE.test(value);
}

export const phoneSchema = z.string().transform((value, ctx) => {
    try {
        return normalizePhone(value);
    } catch {
        ctx.addIssue({ code: "custom", message: "must be an Indonesian number like 0812…, +62812… or 62812…" });
        return z.NEVER;
    }
});
