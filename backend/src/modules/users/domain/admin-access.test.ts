import { describe, expect, it } from "vitest";
import { removesAdminAccess } from "./admin-access.js";

const activeAdmin = { role: "ADMIN", isActive: true } as const;

describe("removesAdminAccess", () => {
    it("is true when an active admin is demoted or deactivated", () => {
        expect(removesAdminAccess(activeAdmin, { role: "KITCHEN" })).toBe(true);
        expect(removesAdminAccess(activeAdmin, { isActive: false })).toBe(true);
    });

    it("is false when an active admin keeps the role and stays active", () => {
        expect(removesAdminAccess(activeAdmin, {})).toBe(false);
        expect(removesAdminAccess(activeAdmin, { role: "ADMIN", isActive: true })).toBe(false);
    });

    it("is false for users who are not active admins", () => {
        expect(removesAdminAccess({ role: "COURIER", isActive: true }, { isActive: false })).toBe(false);
        expect(removesAdminAccess({ role: "ADMIN", isActive: false }, { role: "CUSTOMER" })).toBe(false);
    });
});
