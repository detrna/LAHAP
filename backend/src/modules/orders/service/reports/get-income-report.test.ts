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
});
