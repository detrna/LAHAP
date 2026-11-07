import { BUSINESS_TIME_ZONE } from "../../../../shared/time/time-zone.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { IncomeReport } from "../../domain/report.domain.js";
import { reportPeriodRange, type ReportPeriod } from "../../domain/report-period.js";
import { roundHalfUp } from "../../../../shared/utils/decimal/decimal.js";
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

const MONEY_SCALE = 2;

function withDeliveryChanges<K extends string, R extends IncomeTotals>(
    rows: readonly R[],
    keyOf: (row: R) => K,
    changes: readonly { readonly key: K; readonly deliveryRevenue: number }[],
    emptyRow: (key: K) => R,
): R[] {
    const merged = new Map<K, R>(rows.map(row => [keyOf(row), row]));
    for (const { key, deliveryRevenue } of changes) {
        const row = merged.get(key) ?? emptyRow(key);
        merged.set(key, {
            ...row,
            deliveryRevenue: roundHalfUp(row.deliveryRevenue + deliveryRevenue, MONEY_SCALE),
            totalRevenue: roundHalfUp(row.totalRevenue + deliveryRevenue, MONEY_SCALE),
        });
    }
    return [...merged.values()];
}

export async function getIncomeReport(this: OrdersService, period: ReportPeriod): Promise<IncomeReport> {
    const { from, to } = reportPeriodRange(period, this.clock.now().toPlainDate());
    const range = { from: startOfDay(from), before: startOfDay(to.add({ days: 1 })) };
    const [sums, changes] = await Promise.all([
        this.ordersRepository.sumIncome({
            createdFrom: range.from,
            createdBefore: range.before,
            statuses: PAID_SUBSCRIPTION_STATUSES,
        }),
        this.ordersRepository.sumMethodChangeIncome({ ...range, statuses: PAID_SUBSCRIPTION_STATUSES }),
    ]);
    const income = {
        byPackage: withDeliveryChanges(
            sums.byPackage,
            row => row.packageId,
            changes.byPackage.map(row => ({ key: row.packageId, deliveryRevenue: row.deliveryRevenue })),
            packageId => ({ ...EMPTY, packageId }),
        ),
        byPurchaseType: withDeliveryChanges(
            sums.byPurchaseType,
            row => row.purchaseType,
            changes.byPurchaseType.map(row => ({ key: row.purchaseType, deliveryRevenue: row.deliveryRevenue })),
            purchaseType => ({ ...EMPTY, purchaseType }),
        ),
    };
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
