import { describe, expect, it } from "vitest";
import { toUserRecord, type UserRow } from "./to-user-record.js";

const at = (iso: string) => Temporal.PlainDateTime.from(iso);

function buildRow(overrides: Partial<UserRow> = {}): UserRow {
    return {
        id: "00000003-0000-4000-8000-000000000005",
        name: "Rina Putri",
        email: "rina@lahap.test",
        phone: "6281200000001",
        role: "CUSTOMER",
        address: "Jl. MT Haryono",
        latitude: "-7.93930000",
        longitude: "112.60940000",
        allergyNote: null,
        isActive: true,
        createdAt: at("2026-11-03T01:00:00"),
        updatedAt: at("2026-11-03T02:00:00"),
        allergies: [{ allergyId: "a-2" }, { allergyId: "a-1" }],
        ...overrides,
    };
}

describe("toUserRecord", () => {
    it("maps a row, turning Numeric coordinates into numbers and keeping the allergy ids", () => {
        const record = toUserRecord(buildRow());

        expect(record).toMatchObject({
            id: "00000003-0000-4000-8000-000000000005",
            latitude: -7.9393,
            longitude: 112.6094,
            role: "CUSTOMER",
        });
        expect(record.allergyIds).toEqual(["a-2", "a-1"]);
        expect(record.createdAt.toString()).toBe("2026-11-03T01:00:00");
    });

    it("keeps missing coordinates as null", () => {
        const record = toUserRecord(buildRow({ latitude: null, longitude: null, allergies: [] }));

        expect(record.latitude).toBeNull();
        expect(record.longitude).toBeNull();
        expect(record.allergyIds).toEqual([]);
    });

    it("rejects a role outside ROLES", () => {
        expect(() => toUserRecord(buildRow({ role: "SUPERUSER" }))).toThrow('unknown role "SUPERUSER"');
    });
});
