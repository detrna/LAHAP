import { describe, expect, it } from "vitest";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas.js";

const ALLERGY = "00000002-0000-4000-8000-000000000001";
const base = { phone: "0812-3456-7890", password: "password123", confirmPassword: "password123" };

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
    result.error?.issues.map(issue => issue.path.join(".")) ?? [];

describe("registerSchema", () => {
    it("accepts phone + password and normalizes the phone", () => {
        expect(registerSchema.parse(base)).toEqual({ phone: "6281234567890", password: "password123" });
    });

    it("keeps the optional profile fields, trimming the email", () => {
        const parsed = registerSchema.parse({
            ...base,
            name: "Rina",
            email: "  rina@lahap.test ",
            address: "Jl. MT Haryono",
            latitude: -7.9393,
            longitude: 112.6094,
            allergyIds: [ALLERGY],
            allergyNote: "udang rebon",
        });

        expect(parsed).toMatchObject({ email: "rina@lahap.test", latitude: -7.9393, allergyIds: [ALLERGY] });
    });

    it("drops fields a client must not set, such as role", () => {
        expect(registerSchema.parse({ ...base, role: "ADMIN", isActive: false })).not.toHaveProperty("role");
    });

    it("requires phone, password and confirmPassword", () => {
        expect(issuePaths(registerSchema.safeParse({}))).toEqual(
            expect.arrayContaining(["phone", "password", "confirmPassword"]),
        );
    });

    it("reports a confirmPassword mismatch on confirmPassword", () => {
        expect(issuePaths(registerSchema.safeParse({ ...base, confirmPassword: "password124" }))).toEqual([
            "confirmPassword",
        ]);
    });

    it.each([
        ["shorter than 8 characters", "short"],
        ["longer than 72 characters", "a".repeat(73)],
        ["over bcrypt's 72-byte limit despite fewer characters", "é".repeat(40)],
    ])("rejects a password %s", (_label, password) => {
        expect(issuePaths(registerSchema.safeParse({ ...base, password, confirmPassword: password }))).toContain(
            "password",
        );
    });

    it("rejects an invalid phone or email", () => {
        expect(issuePaths(registerSchema.safeParse({ ...base, phone: "+14155552671" }))).toEqual(["phone"]);
        expect(issuePaths(registerSchema.safeParse({ ...base, email: "not-an-email" }))).toEqual(["email"]);
    });

    it("requires latitude and longitude together and within range", () => {
        expect(issuePaths(registerSchema.safeParse({ ...base, latitude: -7.9 }))).toEqual(["longitude"]);
        expect(issuePaths(registerSchema.safeParse({ ...base, latitude: 91, longitude: 0 }))).toEqual(["latitude"]);
    });

    it("rejects duplicate or malformed allergy ids", () => {
        expect(issuePaths(registerSchema.safeParse({ ...base, allergyIds: [ALLERGY, ALLERGY] }))).toEqual([
            "allergyIds",
        ]);
        expect(issuePaths(registerSchema.safeParse({ ...base, allergyIds: ["nope"] }))).toEqual(["allergyIds.0"]);
    });
});

describe("loginSchema", () => {
    it("accepts a trimmed identifier and a password", () => {
        expect(loginSchema.parse({ identifier: " 081234567890 ", password: "password123" })).toEqual({
            identifier: "081234567890",
            password: "password123",
        });
    });

    it("requires both fields", () => {
        expect(issuePaths(loginSchema.safeParse({ identifier: "  " }))).toEqual(["identifier", "password"]);
    });
});

describe("refreshSchema", () => {
    it("trims a refresh token sent in the body", () => {
        expect(refreshSchema.parse({ refreshToken: " abc " })).toEqual({ refreshToken: "abc" });
    });

    it("allows an empty or missing body, because the token can come from the cookie", () => {
        expect(refreshSchema.parse({})).toEqual({});
        expect(refreshSchema.parse(undefined)).toEqual({});
    });

    it("rejects a blank refresh token", () => {
        expect(issuePaths(refreshSchema.safeParse({ refreshToken: "  " }))).toEqual(["refreshToken"]);
    });
});
