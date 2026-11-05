import { describe, expect, it } from "vitest";
import { buildMembership } from "../../tiers/test-utils/factory/tiers.factory.js";
import { buildUserAllergyRecord, buildUserRecord } from "../test-utils/factory/users.factory.js";
import { toUser } from "./to-user.js";

describe("toUser", () => {
    it("maps a record to the API user with Jakarta timestamps and its allergies", () => {
        const record = buildUserRecord({
            email: "rina@lahap.test",
            address: "Jl. MT Haryono",
            latitude: -7.9393,
            longitude: 112.6094,
            allergies: [buildUserAllergyRecord()],
        });

        expect(toUser(record)).toEqual({
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
            allergies: [
                {
                    id: "00000000-0000-4000-8000-000000000002",
                    name: "Kacang",
                    createdAt: "2026-11-03T08:00:00.000+07:00",
                    updatedAt: "2026-11-03T08:00:00.000+07:00",
                },
            ],
        });
    });

    it("never exposes membership or churn data", () => {
        const user = toUser(buildUserRecord());

        expect(user).not.toHaveProperty("membership");
        expect(user).not.toHaveProperty("isChurned");
        expect(user).not.toHaveProperty("password");
    });

    it("adds membership and churn data only when given", () => {
        const membership = buildMembership();

        expect(toUser(buildUserRecord(), { membership, isChurned: true })).toMatchObject({
            membership,
            isChurned: true,
        });
        expect(toUser(buildUserRecord(), { membership: null })).toMatchObject({ membership: null });
        expect(toUser(buildUserRecord(), { membership: null })).not.toHaveProperty("isChurned");
    });
});
