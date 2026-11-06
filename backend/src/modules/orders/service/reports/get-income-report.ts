import { BUSINESS_TIME_ZONE } from "../../../../shared/time/time-zone.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { IncomeReport } from "../../domain/report.domain.js";
import { reportPeriodRange, type ReportPeriod } from "../../domain/report-period.js";
import type { IncomeTotals } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

const startOfDay = (date: Temporal.PlainDate) => toDbTimestamp(date.toZonedDateTime({ timeZone: BUSINESS_TIME_ZONE }));
const EMPTY: IncomeTotals = {
    orderCount: 0,
    foodRevenue: 0,
    tierDiscount: 0,
    promoDiscount: 0,
    deliveryRevenue: 0,
    totalRevenue: 0,
};

function add(a: IncomeTotals, b: IncomeTotals): IncomeTotals {
    return {
        orderCount: a.orderCount + b.orderCount,
        foodRevenue: a.foodRevenue + b.foodRevenue,
        tierDiscount: a.tierDiscount + b.tierDiscount,
        promoDiscount: a.promoDiscount + b.promoDiscount,
        deliveryRevenue: a.deliveryRevenue + b.deliveryRevenue,
        totalRevenue: a.totalRevenue + b.totalRevenue,
    };
}

const totalsOf = (row: IncomeTotals): IncomeTotals => ({
    orderCount: row.orderCount,
    foodRevenue: row.foodRevenue,
    tierDiscount: row.tierDiscount,
    promoDiscount: row.promoDiscount,
    deliveryRevenue: row.deliveryRevenue,
    totalRevenue: row.totalRevenue,
});

export async function getIncomeReport(this: OrdersService, period: ReportPeriod): Promise<IncomeReport> {
    const { from, to } = reportPeriodRange(period, this.clock.now().toPlainDate());
    const income = await this.ordersRepository.sumIncome({
        createdFrom: startOfDay(from),
        createdBefore: startOfDay(to.add({ days: 1 })),
        statuses: PAID_SUBSCRIPTION_STATUSES,
    });
    const packages = await this.catalog.getPackagesByIds(income.byPackage.map(row => row.packageId));
    const nameById = new Map(packages.map(pkg => [pkg.id, pkg.name]));

    return {
        period,
        from: from.toString(),
        to: to.toString(),
        total: income.byPackage.map(totalsOf).reduce(add, EMPTY),
        byPackage: income.byPackage.map(row => ({
            ...totalsOf(row),
            packageId: row.packageId,
            packageName: nameById.get(row.packageId) ?? "",
        })),
        byPurchaseType: income.byPurchaseType.map(row => ({ ...totalsOf(row), purchaseType: row.purchaseType })),
    };
}
