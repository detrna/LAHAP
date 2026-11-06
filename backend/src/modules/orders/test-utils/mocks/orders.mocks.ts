import { vi } from "vitest";
import type { Cache } from "../../../../shared/ports/cache/cache.js";
import type { PaymentGateway } from "../../../../shared/ports/payment-gateway/payment-gateway.js";
import type { BusinessSettings } from "../../service/interfaces/business-settings.js";
import type { CheckoutCatalog } from "../../service/interfaces/checkout-catalog.js";
import type { CustomerProfiles } from "../../service/interfaces/customer-profiles.js";
import type { OrderNotifier } from "../../service/interfaces/order-notifier.js";
import type { OrdersRepository } from "../../service/interfaces/orders.repository.js";
import type { PromoChecker } from "../../service/interfaces/promo-checker.js";
import type { RealtimePublisher } from "../../service/interfaces/realtime-publisher.js";
import type { ShoppingList } from "../../service/interfaces/shopping-list.js";
import type { SlotObstacles } from "../../service/interfaces/slot-obstacles.js";
import type { UnreadCount } from "../../service/interfaces/unread-count.js";
import type { TierDiscountProvider } from "../../service/interfaces/tier-discount-provider.js";
import type { OrdersService } from "../../service/orders.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedOrdersService = Mocked<
    Pick<
        OrdersService,
        | "previewCheckout"
        | "createSubscription"
        | "getPaymentSession"
        | "handleMidtransNotification"
        | "verifyCashPayment"
        | "confirmRefund"
        | "listMySubscriptions"
        | "getMySubscription"
        | "cancelSubscription"
        | "listMySlots"
        | "skipSlot"
        | "skipDay"
        | "listMyPayments"
        | "markFoodReady"
        | "setAlternativeMenu"
        | "completeDelivery"
        | "completePickup"
        | "correctSlotStatus"
        | "listCourierAssignments"
        | "assignCourier"
        | "listSubscriptionsForAdmin"
        | "getSubscriptionForAdmin"
        | "listSlotsForAdmin"
        | "getSlotForAdmin"
        | "listPaymentsForAdmin"
        | "getIncomeReport"
        | "getDashboard"
    >
>;

export function createMockOrdersRepository(): Mocked<OrdersRepository> {
    return {
        createCheckout: vi.fn(),
        findSubscriptionById: vi.fn(async () => null),
        findPaymentsBySubscriptionId: vi.fn(async () => []),
        changePayment: vi.fn(async () => null),
        expirePendingPayments: vi.fn(async () => []),
        countPortions: vi.fn(async () => []),
        sumIncome: vi.fn(async () => ({ byPackage: [], byPurchaseType: [] })),
        countPaidServiceDays: vi.fn(async () => 0),
        sumTierDiscounts: vi.fn(async () => new Map()),
        listSubscriptions: vi.fn(async () => ({ items: [], total: 0 })),
        listPayments: vi.fn(async () => ({ items: [], total: 0 })),
        listSlots: vi.fn(async () => ({ items: [], total: 0 })),
        findStatusHistory: vi.fn(async () => []),
        findOrdersBySubscriptionId: vi.fn(async () => []),
        findSlotWithSubscription: vi.fn(async () => null),
        findCustomerSlots: vi.fn(async () => []),
        findCompletionTimes: vi.fn(async () => new Map()),
        findSlots: vi.fn(async () => []),
        transitionSlots: vi.fn(async () => []),
        setUsesAlternativeMenu: vi.fn(async () => null),
        assignCourier: vi.fn(async () => 0),
        cancelSubscription: vi.fn(async () => null),
        countPromoUses: vi.fn(async () => new Map()),
        countPromoUsesByUser: vi.fn(async () => 0),
        hasSubscriptionsWithPromo: vi.fn(async () => false),
        findLastSuccessEndDates: vi.fn(async () => new Map()),
        findUserIdsWithLastSuccessEndBefore: vi.fn(async () => []),
    } as Mocked<OrdersRepository>;
}

export function createMockCheckoutCatalog(): Mocked<CheckoutCatalog> {
    return {
        getPackagesByIds: vi.fn(async () => []),
        findSchedules: vi.fn(async () => []),
        getMenusByIds: vi.fn(async () => []),
        getSchedulesByIds: vi.fn(async () => []),
    } as Mocked<CheckoutCatalog>;
}

export function createMockBusinessSettings(): Mocked<BusinessSettings> {
    return { getSettings: vi.fn() } as Mocked<BusinessSettings>;
}

export function createMockTierDiscountProvider(): Mocked<TierDiscountProvider> {
    return {
        getActiveDiscount: vi.fn(async () => null),
        reevaluate: vi.fn(async () => undefined),
    } as Mocked<TierDiscountProvider>;
}

export function createMockPromoChecker(): Mocked<PromoChecker> {
    return { checkPromo: vi.fn() } as Mocked<PromoChecker>;
}

export function createMockCustomerProfiles(): Mocked<CustomerProfiles> {
    return {
        getAllergyProfiles: vi.fn(async () => []),
        filterActiveUserIds: vi.fn(async () => []),
        getSummaries: vi.fn(async () => []),
    } as Mocked<CustomerProfiles>;
}

export function createMockOrderNotifier(): Mocked<OrderNotifier> {
    return {
        notifyUser: vi.fn(async () => undefined),
        notifyAdmins: vi.fn(async () => undefined),
    } as Mocked<OrderNotifier>;
}

export function createMockRealtimePublisher(): Mocked<RealtimePublisher> {
    return { publish: vi.fn(async () => undefined) } as Mocked<RealtimePublisher>;
}

export function createMockSlotObstacles(): Mocked<SlotObstacles> {
    return { findObstaclesByOrderIds: vi.fn(async () => []) } as Mocked<SlotObstacles>;
}

export function createMockShoppingList(): Mocked<ShoppingList> {
    return { getShoppingList: vi.fn(async () => []) } as Mocked<ShoppingList>;
}

export function createMockUnreadCount(): Mocked<UnreadCount> {
    return { countUnread: vi.fn(async () => 0) } as Mocked<UnreadCount>;
}

export function createMockCache(): Mocked<Cache> {
    return {
        set: vi.fn(async () => undefined),
        get: vi.fn(async () => null),
        exists: vi.fn(async () => false),
        increment: vi.fn(),
        delete: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
    } as Mocked<Cache>;
}

export function createMockPaymentGateway(): Mocked<PaymentGateway> {
    return {
        createTransaction: vi.fn(async () => ({ token: "snap-token", redirectUrl: "https://pay.test/snap" })),
        verifyNotification: vi.fn(),
    } as Mocked<PaymentGateway>;
}

export function createMockOrdersService(): MockedOrdersService {
    return {
        previewCheckout: vi.fn(),
        createSubscription: vi.fn(),
        getPaymentSession: vi.fn(),
        handleMidtransNotification: vi.fn(async () => undefined),
        verifyCashPayment: vi.fn(),
        confirmRefund: vi.fn(),
        listMySubscriptions: vi.fn(),
        getMySubscription: vi.fn(),
        cancelSubscription: vi.fn(),
        listMySlots: vi.fn(),
        skipSlot: vi.fn(),
        skipDay: vi.fn(),
        listMyPayments: vi.fn(),
        markFoodReady: vi.fn(),
        setAlternativeMenu: vi.fn(),
        completeDelivery: vi.fn(),
        completePickup: vi.fn(),
        correctSlotStatus: vi.fn(),
        listCourierAssignments: vi.fn(),
        assignCourier: vi.fn(),
        listSubscriptionsForAdmin: vi.fn(),
        getSubscriptionForAdmin: vi.fn(),
        listSlotsForAdmin: vi.fn(),
        getSlotForAdmin: vi.fn(),
        listPaymentsForAdmin: vi.fn(),
        getIncomeReport: vi.fn(),
        getDashboard: vi.fn(),
    } as MockedOrdersService;
}
