import { randomUUID } from "node:crypto";
import type { CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";
import type { OrderPeriod } from "../../../src/modules/catalog/domain/package.domain.js";
import type { PurchaseType, SubscriptionStatus } from "../../../src/modules/orders/domain/subscription.domain.js";

export interface TestPackageInput {
    readonly name?: string | undefined;
    readonly basePrice?: number | undefined;
    readonly periods?: readonly OrderPeriod[] | undefined;
    readonly deliveryTimes?: readonly string[] | undefined;
}

export async function createTestPackage(db: Db, rows: CreatedRows, input: TestPackageInput = {}): Promise<string> {
    const created = await db.orm.public.Package.create({
        name: input.name ?? `Zz Test Package ${randomUUID().slice(0, 8)}`,
        description: "test package",
        basePrice: (input.basePrice ?? 15000).toFixed(2),
        periods: [...(input.periods ?? ["Harian"])],
        deliveryTimes: (input.deliveryTimes ?? ["07:00"]).map(time => Temporal.PlainTime.from(time)),
        photoKey: "packages/test.webp",
    });
    return rows.track("Package", created.id);
}

export const TEST_DELIVERY_POINT = {
    address: "Jl. Veteran No. 8, Malang",
    latitude: "-7.95218900",
    longitude: "112.61287600",
    distanceKm: 3,
} as const;

export interface TestSubscriptionOptions {
    readonly isDelivery?: boolean | undefined;
    readonly purchaseType?: PurchaseType | undefined;
    readonly period?: OrderPeriod | undefined;
    readonly recipientName?: string | undefined;
    readonly notes?: string | undefined;
    readonly pricePerPortion?: number | undefined;
    readonly deliveryFeePerSlot?: number | undefined;
    readonly tierId?: string | undefined;
    readonly tierDiscount?: number | undefined;
    readonly promoCodeId?: string | undefined;
    readonly promoDiscount?: number | undefined;
    readonly needsRefund?: boolean | undefined;
}

export interface TestSubscriptionInput extends TestSubscriptionOptions {
    readonly userId: string;
    readonly packageId: string;
    readonly status: SubscriptionStatus;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
    readonly slotCount?: number | undefined;
}

const toCents = (rupiah: number) => Math.round(rupiah * 100);
const toMoney = (cents: number) => (cents / 100).toFixed(2);

function priceSnapshot(input: TestSubscriptionInput) {
    const isDelivery = input.isDelivery ?? false;
    if (!isDelivery && input.deliveryFeePerSlot !== undefined) {
        throw new Error("a pick-up subscription has no delivery fee");
    }
    const slotCount = input.slotCount ?? 1;
    const foodSubtotal = toCents(input.pricePerPortion ?? 15000) * slotCount;
    const tierDiscount = toCents(input.tierDiscount ?? 0);
    const promoDiscount = toCents(input.promoDiscount ?? 0);
    const deliveryFeePerSlot = isDelivery ? toCents(input.deliveryFeePerSlot ?? 5000) : 0;
    const deliveryFeeTotal = deliveryFeePerSlot * slotCount;
    const totalPrice = foodSubtotal - tierDiscount - promoDiscount + deliveryFeeTotal;
    if (tierDiscount + promoDiscount > foodSubtotal) throw new Error("discounts exceed the food subtotal");
    return {
        pricePerPortion: toMoney(toCents(input.pricePerPortion ?? 15000)),
        foodSubtotal: toMoney(foodSubtotal),
        tierDiscount: toMoney(tierDiscount),
        promoDiscount: toMoney(promoDiscount),
        deliveryFeePerSlot: toMoney(deliveryFeePerSlot),
        deliveryFeeTotal: toMoney(deliveryFeeTotal),
        totalPrice: toMoney(totalPrice),
    };
}

export async function createTestSubscription(db: Db, rows: CreatedRows, input: TestSubscriptionInput): Promise<string> {
    const isDelivery = input.isDelivery ?? false;
    const created = await db.orm.public.Subscription.create({
        userId: input.userId,
        packageId: input.packageId,
        promoCodeId: input.promoCodeId ?? null,
        tierId: input.tierId ?? null,
        status: input.status,
        purchaseType: input.purchaseType ?? "Online",
        period: input.period ?? "Harian",
        startDate: input.startDate,
        endDate: input.endDate,
        isDelivery,
        recipientName: input.recipientName ?? "Test Recipient",
        deliveryAddress: isDelivery ? TEST_DELIVERY_POINT.address : null,
        deliveryLatitude: isDelivery ? TEST_DELIVERY_POINT.latitude : null,
        deliveryLongitude: isDelivery ? TEST_DELIVERY_POINT.longitude : null,
        deliveryDistanceKm: isDelivery ? TEST_DELIVERY_POINT.distanceKm : null,
        notes: input.notes ?? null,
        needsRefund: input.needsRefund ?? false,
        ...priceSnapshot(input),
    });
    return rows.track("Subscription", created.id);
}
