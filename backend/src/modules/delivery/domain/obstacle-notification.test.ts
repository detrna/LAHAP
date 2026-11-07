import { describe, expect, it } from "vitest";
import { buildObstacleNotification } from "./obstacle-notification.js";

describe("buildObstacleNotification (unit)", () => {
    it("titles the notification and puts the service day and meal time before the note", () => {
        expect(
            buildObstacleNotification({
                date: Temporal.PlainDate.from("2026-11-09"),
                time: "12:00",
                note: "Hujan deras, terlambat 20 menit",
            }),
        ).toEqual({
            title: "Kendala pengantaran",
            body: "Senin, 9 Nov · 12:00 — Hujan deras, terlambat 20 menit",
        });
    });
});
