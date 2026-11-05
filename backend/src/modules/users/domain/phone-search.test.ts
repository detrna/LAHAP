import { describe, expect, it } from "vitest";
import { toPhoneSearch } from "./phone-search.js";

describe("toPhoneSearch", () => {
    it("turns a local or +62 prefix into 62, also for partial numbers", () => {
        expect(toPhoneSearch("0812")).toBe("62812");
        expect(toPhoneSearch("+62 812-3456")).toBe("628123456");
    });

    it("gives undefined for anything that is not a local phone number", () => {
        expect(toPhoneSearch("Rina")).toBeUndefined();
        expect(toPhoneSearch("62812")).toBeUndefined();
        expect(toPhoneSearch("0")).toBeUndefined();
    });
});
