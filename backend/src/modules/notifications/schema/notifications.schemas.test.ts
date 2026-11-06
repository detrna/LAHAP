import { describe, expect, it } from "vitest";
import {
    announcementListQuerySchema,
    announcementUpdateSchema,
    broadcastSchema,
    notificationListQuerySchema,
} from "./notifications.schemas.js";

const ID = "5f1b7d0e-8f3a-4a52-9d6a-0f6f5f0f9a11";
const OTHER_ID = "7a2c8e1f-9a4b-4b63-8e7b-1a7a6a1a0b22";
const text = { title: "Libur", body: "Dapur tutup hari ini" };

describe("notificationListQuerySchema", () => {
    it("reads the isRead filter as a boolean, never coercing the string", () => {
        expect(notificationListQuerySchema.parse({ isRead: "false" }).isRead).toBe(false);
        expect(notificationListQuerySchema.parse({ isRead: "true" }).isRead).toBe(true);
        expect(notificationListQuerySchema.parse({}).isRead).toBeUndefined();
        expect(notificationListQuerySchema.safeParse({ isRead: "yes" }).success).toBe(false);
    });
});

describe("announcementListQuerySchema", () => {
    it("accepts a scope and a package id and rejects unknown values", () => {
        expect(announcementListQuerySchema.parse({ scope: "PACKAGE", packageId: ID })).toMatchObject({
            scope: "PACKAGE",
            packageId: ID,
        });
        expect(announcementListQuerySchema.safeParse({ scope: "EVERYONE" }).success).toBe(false);
        expect(announcementListQuerySchema.safeParse({ packageId: "nope" }).success).toBe(false);
    });
});

describe("broadcastSchema", () => {
    it("accepts each target with its own id", () => {
        expect(broadcastSchema.safeParse({ target: "GLOBAL", ...text }).success).toBe(true);
        expect(broadcastSchema.safeParse({ target: "PACKAGE", ...text, packageId: ID }).success).toBe(true);
        expect(broadcastSchema.safeParse({ target: "SCHEDULE", ...text, menuScheduleId: ID }).success).toBe(true);
        expect(broadcastSchema.safeParse({ target: "CUSTOMER", ...text, userId: ID }).success).toBe(true);
    });

    it("requires the id of the target", () => {
        expect(broadcastSchema.safeParse({ target: "PACKAGE", ...text }).success).toBe(false);
        expect(broadcastSchema.safeParse({ target: "SCHEDULE", ...text }).success).toBe(false);
        expect(broadcastSchema.safeParse({ target: "CUSTOMER", ...text }).success).toBe(false);
    });

    it("refuses an id that belongs to another target", () => {
        expect(broadcastSchema.safeParse({ target: "GLOBAL", ...text, packageId: ID }).success).toBe(false);
        expect(broadcastSchema.safeParse({ target: "PACKAGE", ...text, packageId: ID, userId: OTHER_ID }).success).toBe(
            false,
        );
        expect(
            broadcastSchema.safeParse({ target: "CUSTOMER", ...text, userId: ID, menuScheduleId: OTHER_ID }).success,
        ).toBe(false);
    });

    it("trims the text and limits its length", () => {
        expect(broadcastSchema.parse({ target: "GLOBAL", title: "  Libur  ", body: "  Tutup  " })).toEqual({
            target: "GLOBAL",
            title: "Libur",
            body: "Tutup",
        });
        expect(broadcastSchema.safeParse({ target: "GLOBAL", title: "   ", body: "x" }).success).toBe(false);
        expect(broadcastSchema.safeParse({ target: "GLOBAL", title: "x".repeat(151), body: "x" }).success).toBe(false);
        expect(broadcastSchema.safeParse({ target: "GLOBAL", title: "x", body: "x".repeat(2000) }).success).toBe(true);
        expect(broadcastSchema.safeParse({ target: "GLOBAL", title: "x", body: "x".repeat(2001) }).success).toBe(false);
    });

    it("rejects an unknown target", () => {
        expect(broadcastSchema.safeParse({ target: "COURIER", ...text }).success).toBe(false);
    });
});

describe("announcementUpdateSchema", () => {
    it("needs at least one field", () => {
        expect(announcementUpdateSchema.safeParse({}).success).toBe(false);
        expect(announcementUpdateSchema.safeParse({ title: "Baru" }).success).toBe(true);
    });

    it("allows null ids to clear a target", () => {
        expect(announcementUpdateSchema.parse({ scope: "GLOBAL", packageId: null, menuScheduleId: null })).toEqual({
            scope: "GLOBAL",
            packageId: null,
            menuScheduleId: null,
        });
    });

    it("limits the body to 2000 characters", () => {
        expect(announcementUpdateSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    });
});
