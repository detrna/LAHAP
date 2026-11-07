import { describe, expect, it } from "vitest";
import { buildChurnList, type ChurnCandidate, type ChurnContact } from "./churn-list.js";

const TODAY = Temporal.PlainDate.from("2026-11-07");

const candidate = (userId: string, lastEndDate: string, overrides: Partial<ChurnCandidate> = {}): ChurnCandidate => ({
    userId,
    lastEndDate: Temporal.PlainDate.from(lastEndDate),
    lastPackageId: "hemat",
    totalSubscriptions: 1,
    ...overrides,
});

const contact = (id: string, name: string, overrides: Partial<ChurnContact> = {}): ChurnContact => ({
    id,
    name,
    phone: `62812${id}`,
    role: "CUSTOMER",
    ...overrides,
});

const PACKAGES = new Map([
    ["hemat", "Paket Hemat"],
    ["reguler", "Paket Reguler"],
]);

describe("buildChurnList (unit)", () => {
    it("joins each candidate with the customer and the package name and counts the days since the end", () => {
        const list = buildChurnList({
            candidates: [candidate("1", "2026-10-17", { lastPackageId: "reguler", totalSubscriptions: 3 })],
            contacts: [contact("1", "Budi")],
            packageNames: PACKAGES,
            today: TODAY,
        });

        expect(list).toEqual([
            {
                userId: "1",
                name: "Budi",
                phone: "628121",
                lastPackageName: "Paket Reguler",
                lastEndDate: "2026-10-17",
                daysSinceLastOrder: 21,
                totalSubscriptions: 3,
            },
        ]);
    });

    it("leaves out candidates without a customer account or a known package", () => {
        const list = buildChurnList({
            candidates: [
                candidate("1", "2026-10-01"),
                candidate("2", "2026-10-01"),
                candidate("3", "2026-10-01"),
                candidate("4", "2026-10-01", { lastPackageId: "deleted" }),
            ],
            contacts: [contact("1", "Budi"), contact("2", "Kurir", { role: "COURIER" }), contact("4", "Sari")],
            packageNames: PACKAGES,
            today: TODAY,
        });

        expect(list.map(item => item.userId)).toEqual(["1"]);
    });

    it("puts the most recent churners first, then sorts by name", () => {
        const list = buildChurnList({
            candidates: [
                candidate("old", "2026-09-01"),
                candidate("zed", "2026-10-10"),
                candidate("ana", "2026-10-10"),
            ],
            contacts: [contact("old", "Old"), contact("zed", "Zed"), contact("ana", "ana")],
            packageNames: PACKAGES,
            today: TODAY,
        });

        expect(list.map(item => item.userId)).toEqual(["ana", "zed", "old"]);
    });

    it("searches the name and the phone, ignoring case", () => {
        const sources = {
            candidates: [candidate("1", "2026-10-01"), candidate("2", "2026-10-01"), candidate("3", "2026-10-01")],
            contacts: [
                contact("1", "Budi Santoso"),
                contact("2", "Sari", { phone: "6281299990000" }),
                contact("3", "Dewi"),
            ],
            packageNames: PACKAGES,
            today: TODAY,
        };

        expect(buildChurnList({ ...sources, search: "SANTO" }).map(item => item.userId)).toEqual(["1"]);
        expect(buildChurnList({ ...sources, search: "9999" }).map(item => item.userId)).toEqual(["2"]);
        expect(buildChurnList({ ...sources, search: "nobody" })).toEqual([]);
    });
});
