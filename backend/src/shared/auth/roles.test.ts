import { describe, expect, it } from "vitest";
import { isRole, ROLES } from "./roles.js";

describe("isRole", () => {
    it.each(ROLES)("accepts %s", role => {
        expect(isRole(role)).toBe(true);
    });

    it.each(["USER", "admin", " ADMIN", "", null, 1])("rejects %j", value => {
        expect(isRole(value)).toBe(false);
    });
});
