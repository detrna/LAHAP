import { describe, expect, it } from "vitest";
import { setupRetentionService } from "../test-utils/setup/retention.setup.js";

const date = (value: string) => Temporal.PlainDate.from(value);

function setup() {
    const context = setupRetentionService("2026-11-07T10:00:00+07:00[Asia/Jakarta]");
    context.churn.findChurnedCustomers.mockResolvedValue([
        { userId: "budi", lastEndDate: date("2026-10-20"), lastPackageId: "hemat", totalSubscriptions: 2 },
        { userId: "sari", lastEndDate: date("2026-10-01"), lastPackageId: "hemat", totalSubscriptions: 1 },
        { userId: "off", lastEndDate: date("2026-10-01"), lastPackageId: "reguler", totalSubscriptions: 1 },
    ]);
    context.customers.filterActiveUserIds.mockResolvedValue(["budi", "sari"]);
    context.customers.getSummaries.mockResolvedValue([
        { id: "budi", name: "Budi", phone: "62811", role: "CUSTOMER" },
        { id: "sari", name: "Sari", phone: "62812", role: "CUSTOMER" },
    ]);
    context.packages.getPackagesByIds.mockResolvedValue([{ id: "hemat", name: "Paket Hemat" }]);
    return context;
}

describe("RetentionService.listChurnedCustomers (unit)", () => {
    it("asks orders with today's cut-off and keeps only active customers", async () => {
        const { churn, customers, packages, service } = setup();

        const page = await service.listChurnedCustomers({ skip: 0, take: 20 });

        expect(churn.findChurnedCustomers).toHaveBeenCalledWith(date("2026-10-24"));
        expect(customers.filterActiveUserIds).toHaveBeenCalledWith(["budi", "sari", "off"], "CUSTOMER");
        expect(customers.getSummaries).toHaveBeenCalledWith(["budi", "sari"]);
        expect(packages.getPackagesByIds).toHaveBeenCalledWith(["hemat"]);
        expect(page).toEqual({
            items: [
                {
                    userId: "budi",
                    name: "Budi",
                    phone: "62811",
                    lastPackageName: "Paket Hemat",
                    lastEndDate: "2026-10-20",
                    daysSinceLastOrder: 18,
                    totalSubscriptions: 2,
                },
                expect.objectContaining({ userId: "sari", daysSinceLastOrder: 37 }),
            ],
            total: 2,
        });
    });

    it("drops a candidate who ordered again between the two reads", async () => {
        const { churn, service } = setup();
        churn.findChurnedCustomers.mockResolvedValue([
            { userId: "budi", lastEndDate: date("2026-10-24"), lastPackageId: "hemat", totalSubscriptions: 2 },
        ]);

        expect(await service.listChurnedCustomers({ skip: 0, take: 20 })).toEqual({ items: [], total: 0 });
    });

    it("filters by the search before paging and counts the matches", async () => {
        const { service } = setup();

        expect(await service.listChurnedCustomers({ search: "sar", skip: 0, take: 20 })).toMatchObject({
            items: [{ userId: "sari" }],
            total: 1,
        });
        expect(await service.listChurnedCustomers({ skip: 1, take: 1 })).toMatchObject({
            items: [{ userId: "sari" }],
            total: 2,
        });
    });

    it("skips the other providers when nobody is churned", async () => {
        const { churn, customers, packages, service } = setup();
        churn.findChurnedCustomers.mockResolvedValue([]);

        expect(await service.listChurnedCustomers({ skip: 0, take: 20 })).toEqual({ items: [], total: 0 });
        expect(customers.filterActiveUserIds).not.toHaveBeenCalled();
        expect(customers.getSummaries).not.toHaveBeenCalled();
        expect(packages.getPackagesByIds).not.toHaveBeenCalled();
    });

    it("skips the lookups when no churned account is active", async () => {
        const { customers, packages, service } = setup();
        customers.filterActiveUserIds.mockResolvedValue([]);

        expect(await service.listChurnedCustomers({ skip: 0, take: 20 })).toEqual({ items: [], total: 0 });
        expect(customers.getSummaries).not.toHaveBeenCalled();
        expect(packages.getPackagesByIds).not.toHaveBeenCalled();
    });
});
