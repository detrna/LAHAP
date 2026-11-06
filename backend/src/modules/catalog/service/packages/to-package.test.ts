import { describe, expect, it } from "vitest";
import { buildPackageRecord } from "../../test-utils/factory/catalog.factory.js";
import { toPackage } from "./to-package.js";

const NOW = Temporal.PlainDateTime.from("2026-11-03T01:00:00");

describe("toPackage", () => {
    it("renders timestamps in Jakarta, meal times with their range, and availability", () => {
        const item = toPackage(
            buildPackageRecord({
                basePrice: 20000,
                deliveryFreeRadius: 3,
                endAt: Temporal.PlainDateTime.from("2026-12-01T00:00:00"),
            }),
            { now: NOW, photoUrl: "https://storage.test/p.webp" },
        );

        expect(item).toMatchObject({
            id: "00000000-0000-4000-8000-000000000001",
            basePrice: 20000,
            periods: ["Harian", "Mingguan"],
            deliveryTimes: [
                { time: "07:00", range: "Pagi" },
                { time: "12:00", range: "Siang" },
            ],
            deliveryFreeRadius: 3,
            deliveryMaxDistance: null,
            photoUrl: "https://storage.test/p.webp",
            startAt: "2026-11-01T07:00:00.000+07:00",
            endAt: "2026-12-01T07:00:00.000+07:00",
            isActive: true,
            isAvailable: true,
        });
    });

    it("leaves the subscriber count out unless given", () => {
        const record = buildPackageRecord();

        expect(toPackage(record, { now: NOW, photoUrl: "u" })).not.toHaveProperty("activeSubscriberCount");
        expect(toPackage(record, { now: NOW, photoUrl: "u", activeSubscriberCount: 0 })).toHaveProperty(
            "activeSubscriberCount",
            0,
        );
    });

    it("keeps an open-ended window as null and flags an inactive package unavailable", () => {
        const item = toPackage(buildPackageRecord({ isActive: false }), { now: NOW, photoUrl: "u" });

        expect(item.endAt).toBeNull();
        expect(item.isAvailable).toBe(false);
    });
});
