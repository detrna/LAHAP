import { describe, expect, it } from "vitest";
import { buildMenuReminder, findPackagesWithoutPublishedSchedules, reminderWindow } from "./empty-schedule-window.js";

const date = (value: string) => Temporal.PlainDate.from(value);

describe("reminderWindow (unit)", () => {
    it("covers tomorrow through seven days ahead", () => {
        const window = reminderWindow(date("2026-11-07"));

        expect(window.from.toString()).toBe("2026-11-08");
        expect(window.to.toString()).toBe("2026-11-14");
    });

    it("crosses a month end", () => {
        const window = reminderWindow(date("2026-11-28"));

        expect(window.from.toString()).toBe("2026-11-29");
        expect(window.to.toString()).toBe("2026-12-05");
    });
});

describe("findPackagesWithoutPublishedSchedules (unit)", () => {
    const packages = [
        { id: "p-reguler", name: "Paket Reguler" },
        { id: "p-hemat", name: "Paket Hemat" },
        { id: "p-diet", name: "Paket Diet" },
    ];

    it("flags the packages with no published schedule, sorted by name, with their drafts", () => {
        const empty = findPackagesWithoutPublishedSchedules(packages, [
            { packageId: "p-diet", isPublished: true },
            { packageId: "p-diet", isPublished: false },
            { packageId: "p-hemat", isPublished: false },
            { packageId: "p-hemat", isPublished: false },
            { packageId: "p-hemat", isPublished: false },
        ]);

        expect(empty).toEqual([
            { packageId: "p-hemat", name: "Paket Hemat", draftCount: 3 },
            { packageId: "p-reguler", name: "Paket Reguler", draftCount: 0 },
        ]);
    });

    it("flags nothing when every package has a published schedule", () => {
        const empty = findPackagesWithoutPublishedSchedules(
            packages,
            packages.map(item => ({ packageId: item.id, isPublished: true })),
        );

        expect(empty).toEqual([]);
    });

    it("does not let another package's published schedule fill a package", () => {
        const empty = findPackagesWithoutPublishedSchedules(
            [{ id: "p-hemat", name: "Paket Hemat" }],
            [{ packageId: "p-off-sale", isPublished: true }],
        );

        expect(empty).toEqual([{ packageId: "p-hemat", name: "Paket Hemat", draftCount: 0 }]);
    });
});

describe("buildMenuReminder (unit)", () => {
    it("lists every empty package under the window, with its waiting drafts", () => {
        const reminder = buildMenuReminder({ from: date("2026-11-08"), to: date("2026-11-14") }, [
            { packageId: "p-hemat", name: "Paket Hemat", draftCount: 3 },
            { packageId: "p-reguler", name: "Paket Reguler", draftCount: 0 },
        ]);

        expect(reminder).toEqual({
            title: "Menu 7 hari ke depan belum terisi",
            body: [
                "Belum ada menu terpublikasi untuk Minggu, 8 Nov – Sabtu, 14 Nov:",
                "- Paket Hemat (3 draf menunggu publikasi)",
                "- Paket Reguler",
            ].join("\n"),
        });
    });
});
