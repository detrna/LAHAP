import { describe, expect, it } from "vitest";
import { buildPackage } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const totals = (orderCount: number, totalRevenue: number) => ({
    orderCount,
    foodRevenue: totalRevenue,
    tierDiscount: 0,
    promoDiscount: 0,
    deliveryRevenue: 0,
    totalRevenue,
});

describe("OrdersService.getIncomeReport (unit)", () => {
    it("sums paid orders created this week, by package and purchase type", async () => {
        const { service, repository, catalog } = setupOrdersService("2026-11-12T10:00:00+07:00[Asia/Jakarta]");
        repository.sumIncome.mockResolvedValue({
            byPackage: [
                { packageId: "p-1", ...totals(2, 30000) },
                { packageId: "p-2", ...totals(1, 20000) },
            ],
            byPurchaseType: [{ purchaseType: "Online", ...totals(3, 50000) }],
        });
        catalog.getPackagesByIds.mockResolvedValue([buildPackage({ id: "p-1", name: "Paket Hemat" })]);

        const report = await service.getIncomeReport("week");

        expect(repository.sumIncome).toHaveBeenCalledWith({
            createdFrom: Temporal.PlainDateTime.from("2026-11-08T17:00:00"),
            createdBefore: Temporal.PlainDateTime.from("2026-11-15T17:00:00"),
            statuses: ["Success"],
        });
        expect(report).toMatchObject({
            period: "week",
            from: "2026-11-09",
            to: "2026-11-15",
            total: totals(3, 50000),
            byPurchaseType: [{ purchaseType: "Online", orderCount: 3 }],
        });
        expect(report.byPackage.map(row => [row.packageId, row.packageName])).toEqual([
            ["p-1", "Paket Hemat"],
            ["p-2", ""],
        ]);
    });

    it("adds paid delivery upgrades and takes off confirmed delivery refunds of the period", async () => {
        const { service, repository, catalog } = setupOrdersService("2026-11-12T10:00:00+07:00[Asia/Jakarta]");
        repository.sumIncome.mockResolvedValue({
            byPackage: [{ packageId: "p-1", ...totals(2, 30000) }],
            byPurchaseType: [{ purchaseType: "Online", ...totals(2, 30000) }],
        });
        repository.sumMethodChangeIncome.mockResolvedValue({
            byPackage: [
                { packageId: "p-1", deliveryRevenue: 6000 },
                { packageId: "p-2", deliveryRevenue: -4000 },
            ],
            byPurchaseType: [
                { purchaseType: "Online", deliveryRevenue: 6000 },
                { purchaseType: "Offline", deliveryRevenue: -4000 },
            ],
        });
        catalog.getPackagesByIds.mockResolvedValue([]);

        const report = await service.getIncomeReport("week");

        expect(repository.sumMethodChangeIncome).toHaveBeenCalledWith({
            from: Temporal.PlainDateTime.from("2026-11-08T17:00:00"),
            before: Temporal.PlainDateTime.from("2026-11-15T17:00:00"),
            statuses: ["Success"],
        });
        expect(report.byPackage).toEqual([
            expect.objectContaining({ packageId: "p-1", orderCount: 2, deliveryRevenue: 6000, totalRevenue: 36000 }),
            expect.objectContaining({ packageId: "p-2", orderCount: 0, deliveryRevenue: -4000, totalRevenue: -4000 }),
        ]);
        expect(report.byPurchaseType).toEqual([
            expect.objectContaining({ purchaseType: "Online", deliveryRevenue: 6000, totalRevenue: 36000 }),
            expect.objectContaining({ purchaseType: "Offline", orderCount: 0, totalRevenue: -4000 }),
        ]);
        expect(report.total).toMatchObject({ orderCount: 2, deliveryRevenue: 2000, totalRevenue: 32000 });
    });
});
