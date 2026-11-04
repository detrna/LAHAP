import { buildMenu } from "../../../catalog/test-utils/factory/catalog.factory.js";
import type { CheckoutSlotPreview, CheckoutPreview, CheckoutResult } from "../../domain/checkout.domain.js";
import type { OrderStatusHistory, Order, SkipDayResult, CourierScheduleEntry } from "../../domain/order.domain.js";
import type { Payment, PaymentSession } from "../../domain/payment.domain.js";
import type { DashboardStats, IncomeReport } from "../../domain/report.domain.js";
import type { Subscription } from "../../domain/subscription.domain.js";

export function buildSubscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000001",
        packageId: "00000000-0000-4000-8000-000000000001",
        promoCodeId: null,
        tierId: null,
        status: "Pending",
        displayStatus: "Akan Datang",
        purchaseType: "Online",
        period: "Harian",
        startDate: "2026-11-03",
        endDate: "2026-11-03",
        isDelivery: false,
        recipientName: "test recipientName",
        deliveryAddress: null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        deliveryDistanceKm: null,
        notes: null,
        pricePerPortion: 0,
        foodSubtotal: 0,
        tierDiscount: 0,
        promoDiscount: 0,
        deliveryFeePerSlot: 0,
        deliveryFeeTotal: 0,
        totalPrice: 0,
        needsRefund: false,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildOrderStatusHistory(overrides: Partial<OrderStatusHistory> = {}): OrderStatusHistory {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        orderId: "00000000-0000-4000-8000-000000000001",
        fromStatus: null,
        toStatus: "Terjadwal",
        changedById: null,
        adminNote: null,
        changedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        subscriptionId: "00000000-0000-4000-8000-000000000001",
        menuScheduleId: "00000000-0000-4000-8000-000000000001",
        courierId: null,
        status: "Terjadwal",
        usesAlternativeMenu: false,
        skipReason: null,
        completedAt: null,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildSkipDayResult(overrides: Partial<SkipDayResult> = {}): SkipDayResult {
    return { skippedCount: 0, orders: [], ...overrides };
}

export function buildCourierScheduleEntry(overrides: Partial<CourierScheduleEntry> = {}): CourierScheduleEntry {
    return {
        date: "2026-11-03",
        deliveryTime: { time: "07:00", range: "Pagi" },
        courier: null,
        deliveryCount: 0,
        unassignedCount: 0,
        ...overrides,
    };
}

export function buildCheckoutSlotPreview(overrides: Partial<CheckoutSlotPreview> = {}): CheckoutSlotPreview {
    return {
        menuScheduleId: "00000000-0000-4000-8000-000000000001",
        date: "2026-11-03",
        deliveryTime: { time: "07:00", range: "Pagi" },
        menu: buildMenu(),
        hasAlternative: false,
        clashingAllergies: [],
        ...overrides,
    };
}

export function buildCheckoutPreview(overrides: Partial<CheckoutPreview> = {}): CheckoutPreview {
    return {
        slots: [],
        slotCount: 1,
        startDate: "2026-11-03",
        endDate: "2026-11-03",
        cutoffAt: "2026-11-03T00:00:00.000+07:00",
        delivery: { available: false, distanceKm: null, maxDistanceKm: 0, feePerSlot: 0 },
        promo: null,
        pricePerPortion: 0,
        foodSubtotal: 0,
        tierDiscount: 0,
        promoDiscount: 0,
        deliveryFeePerSlot: 0,
        deliveryFeeTotal: 0,
        totalPrice: 0,
        ...overrides,
    };
}

export function buildCheckoutResult(overrides: Partial<CheckoutResult> = {}): CheckoutResult {
    return { subscription: buildSubscription(), payment: buildPayment(), paymentSession: null, ...overrides };
}

export function buildPayment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        subscriptionId: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000001",
        method: "MIDTRANS",
        doneOnline: false,
        type: "SUBSCRIPTION",
        amount: 0,
        status: "Pending",
        transactionId: null,
        paidAt: null,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildPaymentSession(overrides: Partial<PaymentSession> = {}): PaymentSession {
    return {
        snapToken: "test snapToken",
        redirectUrl: "https://example.com/redirectUrl",
        expiresAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildDashboardStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
    return {
        period: "today",
        from: "2026-11-03",
        to: "2026-11-03",
        income: {
            orderCount: 0,
            foodRevenue: 0,
            tierDiscount: 0,
            promoDiscount: 0,
            deliveryRevenue: 0,
            totalRevenue: 0,
        },
        topMenus: [],
        shortages: [],
        unreadNotificationCount: 0,
        ...overrides,
    };
}

export function buildIncomeReport(overrides: Partial<IncomeReport> = {}): IncomeReport {
    return {
        period: "today",
        from: "2026-11-03",
        to: "2026-11-03",
        total: {
            orderCount: 0,
            foodRevenue: 0,
            tierDiscount: 0,
            promoDiscount: 0,
            deliveryRevenue: 0,
            totalRevenue: 0,
        },
        byPackage: [],
        byPurchaseType: [],
        ...overrides,
    };
}
