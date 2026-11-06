import { describe, expect, it } from "vitest";
import { buildAllergy } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildMembership } from "../../tiers/test-utils/factory/tiers.factory.js";
import { buildUserRecord } from "../test-utils/factory/users.factory.js";
import { toUser } from "./to-user.js";

describe("toUser", () => {
    it("maps a record to the API user with Jakarta timestamps and the given allergies", () => {
        const record = buildUserRecord({
            email: "rina@lahap.test",
            address: "Jl. MT Haryono",
            latitude: -7.9393,
            longitude: 112.6094,
            allergyIds: [buildAllergy().id],
        });

        expect(toUser(record, { allergies: [buildAllergy()] })).toEqual({
            id: record.id,
            name: "test name",
            email: "rina@lahap.test",
            phone: "6281200000000",
            role: "CUSTOMER",
            address: "Jl. MT Haryono",
            latitude: -7.9393,
            longitude: 112.6094,
            allergyNote: null,
            isActive: true,
            createdAt: "2026-11-03T08:00:00.000+07:00",
            updatedAt: "2026-11-03T08:00:00.000+07:00",
            allergies: [buildAllergy()],
        });
    });

    it("never exposes membership or churn data unless given", () => {
        const user = toUser(buildUserRecord(), { allergies: [] });

        expect(user).not.toHaveProperty("membership");
        expect(user).not.toHaveProperty("isChurned");
        expect(user).not.toHaveProperty("password");
    });

    it("adds membership and churn data only when given", () => {
        const membership = buildMembership();

        expect(toUser(buildUserRecord(), { allergies: [], membership, isChurned: true })).toMatchObject({
            membership,
            isChurned: true,
        });
        expect(toUser(buildUserRecord(), { allergies: [], membership: null })).toMatchObject({ membership: null });
        expect(toUser(buildUserRecord(), { allergies: [], membership: null })).not.toHaveProperty("isChurned");
    });
});
