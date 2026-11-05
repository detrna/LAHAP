import { describe, expect, it } from "vitest";
import {
    passwordChangeSchema,
    profileUpdateSchema,
    userCreateSchema,
    userListQuerySchema,
    userUpdateSchema,
} from "./users.schemas.js";

const ALLERGY_A = "00000002-0000-4000-8000-000000000001";

describe("profileUpdateSchema", () => {
    it("normalizes the phone and accepts null to clear optional fields", () => {
        expect(
            profileUpdateSchema.parse({
                phone: "0812-3456-7890",
                email: null,
                address: null,
                latitude: null,
                longitude: null,
                allergyNote: null,
            }),
        ).toEqual({
            phone: "6281234567890",
            email: null,
            address: null,
            latitude: null,
            longitude: null,
            allergyNote: null,
        });
    });

    it("rejects an empty body, also after stripping admin-only fields", () => {
        expect(profileUpdateSchema.safeParse({}).success).toBe(false);
        expect(profileUpdateSchema.safeParse({ role: "ADMIN", isActive: false }).success).toBe(false);
    });

    it("strips admin-only fields", () => {
        expect(profileUpdateSchema.parse({ name: "Rina", role: "ADMIN", password: "password123" })).toEqual({
            name: "Rina",
        });
    });

    it("rejects a blank name, duplicate allergies and half a coordinate pair", () => {
        expect(profileUpdateSchema.safeParse({ name: "   " }).success).toBe(false);
        expect(profileUpdateSchema.safeParse({ allergyIds: [ALLERGY_A, ALLERGY_A] }).success).toBe(false);
        expect(profileUpdateSchema.safeParse({ latitude: null }).success).toBe(false);
        expect(profileUpdateSchema.safeParse({ latitude: -7.9, longitude: null }).success).toBe(false);
    });
});

describe("userUpdateSchema", () => {
    it("accepts the admin-only fields", () => {
        expect(userUpdateSchema.parse({ role: "COURIER", isActive: false, password: "password123" })).toEqual({
            role: "COURIER",
            isActive: false,
            password: "password123",
        });
    });

    it("rejects an unknown role and a short password", () => {
        expect(userUpdateSchema.safeParse({ role: "OWNER" }).success).toBe(false);
        expect(userUpdateSchema.safeParse({ password: "short" }).success).toBe(false);
    });
});

describe("userCreateSchema", () => {
    it("requires phone, password and role", () => {
        expect(userCreateSchema.safeParse({ phone: "081234567890", password: "password123" }).success).toBe(false);
        expect(
            userCreateSchema.parse({ phone: "081234567890", password: "password123", role: "KITCHEN" }),
        ).toMatchObject({ phone: "6281234567890", role: "KITCHEN" });
    });

    it("requires both coordinates together", () => {
        expect(
            userCreateSchema.safeParse({
                phone: "081234567890",
                password: "password123",
                role: "CUSTOMER",
                latitude: 1,
            }).success,
        ).toBe(false);
    });
});

describe("passwordChangeSchema", () => {
    it("requires a current password and a valid new one", () => {
        expect(passwordChangeSchema.safeParse({ currentPassword: "", newPassword: "password123" }).success).toBe(false);
        expect(passwordChangeSchema.safeParse({ currentPassword: "x", newPassword: "short" }).success).toBe(false);
        expect(passwordChangeSchema.safeParse({ currentPassword: "x", newPassword: "password123" }).success).toBe(true);
    });
});

describe("userListQuerySchema", () => {
    it("takes one role or several", () => {
        expect(userListQuerySchema.parse({ role: "ADMIN" }).role).toEqual(["ADMIN"]);
        expect(userListQuerySchema.parse({ role: ["KITCHEN", "COURIER"] }).role).toEqual(["KITCHEN", "COURIER"]);
        expect(userListQuerySchema.parse({}).role).toBeUndefined();
    });

    it("rejects unknown and repeated roles", () => {
        expect(userListQuerySchema.safeParse({ role: "OWNER" }).success).toBe(false);
        expect(userListQuerySchema.safeParse({ role: ["ADMIN", "ADMIN"] }).success).toBe(false);
    });

    it("reads boolean filters strictly, keeps pagination and drops an empty search", () => {
        expect(userListQuerySchema.parse({ isActive: "false", isChurned: "true", page: "2", search: " " })).toEqual({
            isActive: false,
            isChurned: true,
            page: 2,
            limit: 20,
        });
        expect(userListQuerySchema.safeParse({ isActive: "yes" }).success).toBe(false);
    });
});
