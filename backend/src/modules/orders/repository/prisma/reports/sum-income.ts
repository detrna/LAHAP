import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { fromNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { PurchaseType } from "../../../domain/subscription.domain.js";
import type { IncomeQuery, IncomeRecord, IncomeTotals } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

const money = (value: unknown) => (value === null || value === undefined ? 0 : fromNumeric(String(value)));

export async function sumIncome(this: PrismaOrdersRepository, query: IncomeQuery): Promise<IncomeRecord> {
    const counted = () =>
        this.db.orm.public.Subscription.where(row => row.status.in([...query.statuses] as Varchar<30>[]))
            .where(row => row.createdAt.gte(query.createdFrom))
            .where(row => row.createdAt.lt(query.createdBefore));
    try {
        const [byPackage, byPurchaseType] = await Promise.all([
            counted()
                .groupBy("packageId")
                .aggregate(aggregate => ({
                    orderCount: aggregate.count(),
                    foodRevenue: aggregate.sum("foodSubtotal"),
                    tierDiscount: aggregate.sum("tierDiscount"),
                    promoDiscount: aggregate.sum("promoDiscount"),
                    deliveryRevenue: aggregate.sum("deliveryFeeTotal"),
                    totalRevenue: aggregate.sum("totalPrice"),
                })),
            counted()
                .groupBy("purchaseType")
                .aggregate(aggregate => ({
                    orderCount: aggregate.count(),
                    foodRevenue: aggregate.sum("foodSubtotal"),
                    tierDiscount: aggregate.sum("tierDiscount"),
                    promoDiscount: aggregate.sum("promoDiscount"),
                    deliveryRevenue: aggregate.sum("deliveryFeeTotal"),
                    totalRevenue: aggregate.sum("totalPrice"),
                })),
        ]);
        const toTotals = (row: {
            orderCount: number;
            foodRevenue: unknown;
            tierDiscount: unknown;
            promoDiscount: unknown;
            deliveryRevenue: unknown;
            totalRevenue: unknown;
        }): IncomeTotals => ({
            orderCount: row.orderCount,
            foodRevenue: money(row.foodRevenue),
            tierDiscount: money(row.tierDiscount),
            promoDiscount: money(row.promoDiscount),
            deliveryRevenue: money(row.deliveryRevenue),
            totalRevenue: money(row.totalRevenue),
        });
        return {
            byPackage: byPackage.map(row => ({ packageId: row.packageId, ...toTotals(row) })),
            byPurchaseType: byPurchaseType.map(row => ({
                purchaseType: row.purchaseType as PurchaseType,
                ...toTotals(row),
            })),
        };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("sumIncome", cause);
    }
}
