import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { fromNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import { roundHalfUp } from "../../../../../shared/utils/decimal/decimal.js";
import type { PurchaseType } from "../../../domain/subscription.domain.js";
import type {
    MethodChangeIncomeQuery,
    MethodChangeIncomeRecord,
} from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

const MONEY_SCALE = 2;

function addTo<K>(sums: Map<K, number>, key: K, amount: number): void {
    sums.set(key, (sums.get(key) ?? 0) + amount);
}

export async function sumMethodChangeIncome(
    this: PrismaOrdersRepository,
    query: MethodChangeIncomeQuery,
): Promise<MethodChangeIncomeRecord> {
    const orm = this.db.orm;
    try {
        const paidUpgrades = await orm.public.Payment.where({ type: "DELIVERY_SERVICE_UPGRADE", status: "Success" })
            .where(payment => payment.paidAt.gte(query.from))
            .where(payment => payment.paidAt.lt(query.before))
            .select("id")
            .all();
        const [upgrades, refunds] = await Promise.all([
            paidUpgrades.length === 0
                ? []
                : orm.public.DeliveryMethodChange.where(change =>
                      change.paymentId.in(paidUpgrades.map(payment => payment.id) as Varchar<36>[]),
                  )
                      .where({ status: "Success", toDelivery: true })
                      .select("subscriptionId", "amount")
                      .all(),
            orm.public.DeliveryMethodChange.where({ toDelivery: false })
                .where(change => change.refundedAt.gte(query.from))
                .where(change => change.refundedAt.lt(query.before))
                .select("subscriptionId", "amount")
                .all(),
        ]);
        const movements = [
            ...upgrades.map(row => ({ subscriptionId: row.subscriptionId, amount: fromNumeric(row.amount) })),
            ...refunds.map(row => ({ subscriptionId: row.subscriptionId, amount: -fromNumeric(row.amount) })),
        ];
        if (movements.length === 0) return { byPackage: [], byPurchaseType: [] };

        const subscriptionIds = [...new Set(movements.map(movement => movement.subscriptionId))];
        const subscriptions = await orm.public.Subscription.where(row => row.id.in(subscriptionIds as Varchar<36>[]))
            .where(row => row.status.in([...query.statuses] as Varchar<30>[]))
            .select("id", "packageId", "purchaseType")
            .all();
        const byId = new Map(subscriptions.map(row => [row.id, row]));
        const byPackage = new Map<string, number>();
        const byPurchaseType = new Map<PurchaseType, number>();
        for (const movement of movements) {
            const subscription = byId.get(movement.subscriptionId);
            if (subscription === undefined) continue;
            addTo(byPackage, subscription.packageId, movement.amount);
            addTo(byPurchaseType, subscription.purchaseType as PurchaseType, movement.amount);
        }
        return {
            byPackage: [...byPackage].map(([packageId, amount]) => ({
                packageId,
                deliveryRevenue: roundHalfUp(amount, MONEY_SCALE),
            })),
            byPurchaseType: [...byPurchaseType].map(([purchaseType, amount]) => ({
                purchaseType,
                deliveryRevenue: roundHalfUp(amount, MONEY_SCALE),
            })),
        };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("sumMethodChangeIncome", cause);
    }
}
