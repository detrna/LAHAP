import { describe, expect, it } from "vitest";
import { buildPackageRecord, buildScheduleRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

function setup(now = "2026-11-07T09:00:00+07:00[Asia/Jakarta]") {
    const context = setupCatalogService();
    context.clock.set(now);
    context.repository.findAvailablePackages.mockResolvedValue([
        buildPackageRecord({ id: "p-hemat", name: "Paket Hemat" }),
        buildPackageRecord({ id: "p-reguler", name: "Paket Reguler" }),
    ]);
    return context;
}

const firstCall = (mock: { mock: { calls: unknown[][] } }) => mock.mock.calls[0]?.[0];

describe("CatalogService.remindEmptySchedules (unit)", () => {
    it("notifies the admins once about every package on sale with no published schedule in the next 7 days", async () => {
        const { service, repository, adminNotifier } = setup();
        repository.findSchedules.mockResolvedValue([
            buildScheduleRecord({ id: "s-1", packageId: "p-reguler", isPublished: true }),
            buildScheduleRecord({ id: "s-2", packageId: "p-hemat", isPublished: false }),
            buildScheduleRecord({ id: "s-3", packageId: "p-hemat", isPublished: false }),
        ]);

        const result = await service.remindEmptySchedules();

        expect(result).toEqual({ from: "2026-11-08", to: "2026-11-14", emptyPackageIds: ["p-hemat"] });
        expect(adminNotifier.notifyAdmins).toHaveBeenCalledTimes(1);
        expect(adminNotifier.notifyAdmins).toHaveBeenCalledWith({
            title: "Menu 7 hari ke depan belum terisi",
            body: [
                "Belum ada menu terpublikasi untuk Minggu, 8 Nov – Sabtu, 14 Nov:",
                "- Paket Hemat (2 draf menunggu publikasi)",
            ].join("\n"),
        });
    });

    it("asks for the packages on sale now and every schedule from tomorrow through seven days ahead", async () => {
        const { service, repository } = setup();

        await service.remindEmptySchedules();

        expect(String(firstCall(repository.findAvailablePackages))).toBe("2026-11-07T02:00:00");
        const filter = firstCall(repository.findSchedules) as { from: Temporal.PlainDate; to: Temporal.PlainDate };
        expect(Object.keys(filter).sort()).toEqual(["from", "to"]);
        expect(filter.from.toString()).toBe("2026-11-08");
        expect(filter.to.toString()).toBe("2026-11-14");
    });

    it("takes the window from the business date, not the UTC date", async () => {
        const { service, repository } = setup("2026-11-08T00:30:00+07:00[Asia/Jakarta]");

        const result = await service.remindEmptySchedules();

        expect(result).toMatchObject({ from: "2026-11-09", to: "2026-11-15" });
        const filter = firstCall(repository.findSchedules) as { from: Temporal.PlainDate };
        expect(filter.from.toString()).toBe("2026-11-09");
    });

    it("sends nothing when every package on sale has a published schedule", async () => {
        const { service, repository, adminNotifier } = setup();
        repository.findSchedules.mockResolvedValue([
            buildScheduleRecord({ id: "s-1", packageId: "p-hemat", isPublished: true }),
            buildScheduleRecord({ id: "s-2", packageId: "p-reguler", isPublished: true }),
        ]);

        const result = await service.remindEmptySchedules();

        expect(result).toEqual({ from: "2026-11-08", to: "2026-11-14", emptyPackageIds: [] });
        expect(adminNotifier.notifyAdmins).not.toHaveBeenCalled();
    });

    it("reads no schedules and sends nothing when no package is on sale", async () => {
        const { service, repository, adminNotifier } = setup();
        repository.findAvailablePackages.mockResolvedValue([]);

        const result = await service.remindEmptySchedules();

        expect(result).toEqual({ from: "2026-11-08", to: "2026-11-14", emptyPackageIds: [] });
        expect(repository.findSchedules).not.toHaveBeenCalled();
        expect(adminNotifier.notifyAdmins).not.toHaveBeenCalled();
    });

    it("rethrows a failed notification so the job run fails and is retried", async () => {
        const { service, adminNotifier } = setup();
        const failure = new Error("database down");
        adminNotifier.notifyAdmins.mockRejectedValueOnce(failure);

        await expect(service.remindEmptySchedules()).rejects.toBe(failure);
    });
});
