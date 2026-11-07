import type { Cache } from "../../../shared/ports/cache/cache.js";
import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { Logger } from "../../../shared/ports/logger/logger.js";
import type { PaymentGateway } from "../../../shared/ports/payment-gateway/payment-gateway.js";
import { createSubscription } from "./checkout/create-subscription.js";
import { previewCheckout } from "./checkout/preview-checkout.js";
import { quoteCheckout } from "./checkout/quote-checkout.js";
import { selectCheckoutSlots } from "./checkout/select-checkout-slots.js";
import type { BusinessSettings } from "./interfaces/business-settings.js";
import type { CheckoutCatalog } from "./interfaces/checkout-catalog.js";
import type { CustomerProfiles } from "./interfaces/customer-profiles.js";
import type { OrderNotifier } from "./interfaces/order-notifier.js";
import type { OrdersRepository } from "./interfaces/orders.repository.js";
import type { PromoChecker } from "./interfaces/promo-checker.js";
import type { RealtimePublisher } from "./interfaces/realtime-publisher.js";
import type { ShoppingList } from "./interfaces/shopping-list.js";
import type { SlotObstacles } from "./interfaces/slot-obstacles.js";
import type { UnreadCount } from "./interfaces/unread-count.js";
import type { TierDiscountProvider } from "./interfaces/tier-discount-provider.js";
import { afterSubscriptionCancelled } from "./payments/after-subscription-cancelled.js";
import { afterSubscriptionPaid } from "./payments/after-subscription-paid.js";
import { applyPaymentEffects } from "./payments/apply-payment-effects.js";
import { confirmRefund } from "./payments/confirm-refund.js";
import { expirePendingPayments } from "./payments/expire-pending-payments.js";
import { getPaymentSession } from "./payments/get-payment-session.js";
import { handleMidtransNotification } from "./payments/handle-midtrans-notification.js";
import { readPaymentSession, storePaymentSession } from "./payments/payment-session-store.js";
import { verifyCashPayment } from "./payments/verify-cash-payment.js";
import { listMyPayments } from "./payments/list-my-payments.js";
import { listPaymentsForAdmin } from "./admin/admin-payments.js";
import { getSlotForAdmin, listSlotsForAdmin } from "./admin/admin-slots.js";
import { getSubscriptionForAdmin, listSubscriptionsForAdmin } from "./admin/admin-subscriptions.js";
import { completeDelivery, completePickup } from "./delivery/complete-slot.js";
import { correctSlotStatus } from "./delivery/correct-slot-status.js";
import { assignCourier, listCourierAssignments } from "./delivery/courier-assignments.js";
import { markFoodReady } from "./kitchen/mark-food-ready.js";
import { prepareDueSlots } from "./kitchen/prepare-due-slots.js";
import { setAlternativeMenu } from "./kitchen/set-alternative-menu.js";
import { presentOrders } from "./present-orders.js";
import { listMySlots } from "./slots/list-my-slots.js";
import { publishSlotChanges } from "./slots/publish-slot-changes.js";
import { skipDay } from "./slots/skip-day.js";
import { skipSlot } from "./slots/skip-slot.js";
import { cancelSubscription } from "./subscriptions/cancel-subscription.js";
import { getMySubscription } from "./subscriptions/get-my-subscription.js";
import { listMySubscriptions } from "./subscriptions/list-my-subscriptions.js";
import {
    findAnnouncementTargetsOf,
    findCustomerIdsForPackage,
    findCustomerIdsForSchedule,
} from "./provided/announcement-audience.js";
import {
    countActiveSubscribers,
    deleteInactiveSlots,
    findSchedulesUsingAlternative,
    findSchedulesWithOrders,
    findSubscriptionPeriods,
} from "./provided/order-activity.js";
import { findChurnedCustomers } from "./provided/find-churned-customers.js";
import { findLastSuccessEndDates } from "./provided/find-last-success-end-dates.js";
import { findUserIdsWithLastSuccessEndBefore } from "./provided/find-user-ids-with-last-success-end-before.js";
import { getLastSuccessSummary } from "./provided/get-last-success-summary.js";
import { countPaidServiceDays, sumTierDiscounts } from "./provided/order-stats.js";
import { listCourierSlots } from "./provided/courier-slots.js";
import { listKitchenSlots } from "./provided/kitchen-slots.js";
import { getSlotForObstacle } from "./provided/slot-for-obstacle.js";
import { countPortionsBySchedule } from "./provided/portion-counts.js";
import { countPromoUses, countPromoUsesByUser, hasPendingSubscriptions } from "./provided/promo-usage.js";
import { getDashboard } from "./reports/get-dashboard.js";
import { getIncomeReport } from "./reports/get-income-report.js";

export interface OrdersServiceDeps {
    readonly clock: Clock;
    readonly logger: Logger;
    readonly cache: Cache;
    readonly paymentGateway: PaymentGateway;
    readonly generateId: () => string;
    readonly catalog: CheckoutCatalog;
    readonly settings: BusinessSettings;
    readonly tierDiscounts: TierDiscountProvider;
    readonly promoChecker: PromoChecker;
    readonly customers: CustomerProfiles;
    readonly notifier: OrderNotifier;
    readonly realtime: RealtimePublisher;
    readonly obstacles: SlotObstacles;
    readonly shoppingList: ShoppingList;
    readonly unreadCount: UnreadCount;
}

export class OrdersService {
    readonly clock: Clock;
    readonly logger: Logger;
    readonly cache: Cache;
    readonly paymentGateway: PaymentGateway;
    readonly generateId: () => string;
    readonly catalog: CheckoutCatalog;
    readonly settings: BusinessSettings;
    readonly tierDiscounts: TierDiscountProvider;
    readonly promoChecker: PromoChecker;
    readonly customers: CustomerProfiles;
    readonly notifier: OrderNotifier;
    readonly realtime: RealtimePublisher;
    readonly obstacles: SlotObstacles;
    readonly shoppingList: ShoppingList;
    readonly unreadCount: UnreadCount;

    constructor(
        readonly ordersRepository: OrdersRepository,
        deps: OrdersServiceDeps,
    ) {
        this.clock = deps.clock;
        this.logger = deps.logger;
        this.cache = deps.cache;
        this.paymentGateway = deps.paymentGateway;
        this.generateId = deps.generateId;
        this.catalog = deps.catalog;
        this.settings = deps.settings;
        this.tierDiscounts = deps.tierDiscounts;
        this.promoChecker = deps.promoChecker;
        this.customers = deps.customers;
        this.notifier = deps.notifier;
        this.realtime = deps.realtime;
        this.obstacles = deps.obstacles;
        this.shoppingList = deps.shoppingList;
        this.unreadCount = deps.unreadCount;
    }

    selectCheckoutSlots = selectCheckoutSlots;
    quoteCheckout = quoteCheckout;
    previewCheckout = previewCheckout;
    createSubscription = createSubscription;
    getPaymentSession = getPaymentSession;
    storePaymentSession = storePaymentSession;
    readPaymentSession = readPaymentSession;
    afterSubscriptionPaid = afterSubscriptionPaid;
    afterSubscriptionCancelled = afterSubscriptionCancelled;
    handleMidtransNotification = handleMidtransNotification;
    applyPaymentEffects = applyPaymentEffects;
    verifyCashPayment = verifyCashPayment;
    confirmRefund = confirmRefund;
    expirePendingPayments = expirePendingPayments;
    listMyPayments = listMyPayments;

    presentOrders = presentOrders;
    listMySubscriptions = listMySubscriptions;
    getMySubscription = getMySubscription;
    cancelSubscription = cancelSubscription;
    listMySlots = listMySlots;
    skipSlot = skipSlot;
    skipDay = skipDay;
    publishSlotChanges = publishSlotChanges;
    markFoodReady = markFoodReady;
    setAlternativeMenu = setAlternativeMenu;
    prepareDueSlots = prepareDueSlots;
    completeDelivery = completeDelivery;
    completePickup = completePickup;
    correctSlotStatus = correctSlotStatus;
    listCourierAssignments = listCourierAssignments;
    assignCourier = assignCourier;
    listSubscriptionsForAdmin = listSubscriptionsForAdmin;
    getSubscriptionForAdmin = getSubscriptionForAdmin;
    listSlotsForAdmin = listSlotsForAdmin;
    getSlotForAdmin = getSlotForAdmin;
    listPaymentsForAdmin = listPaymentsForAdmin;
    getIncomeReport = getIncomeReport;
    getDashboard = getDashboard;

    countPromoUses = countPromoUses;
    countPromoUsesByUser = countPromoUsesByUser;
    hasPendingSubscriptions = hasPendingSubscriptions;
    countPaidServiceDays = countPaidServiceDays;
    sumTierDiscounts = sumTierDiscounts;
    countPortionsBySchedule = countPortionsBySchedule;
    findLastSuccessEndDates = findLastSuccessEndDates;
    findUserIdsWithLastSuccessEndBefore = findUserIdsWithLastSuccessEndBefore;
    findChurnedCustomers = findChurnedCustomers;
    getLastSuccessSummary = getLastSuccessSummary;
    countActiveSubscribers = countActiveSubscribers;
    findSchedulesWithOrders = findSchedulesWithOrders;
    findSchedulesUsingAlternative = findSchedulesUsingAlternative;
    findSubscriptionPeriods = findSubscriptionPeriods;
    deleteInactiveSlots = deleteInactiveSlots;
    findCustomerIdsForPackage = findCustomerIdsForPackage;
    findCustomerIdsForSchedule = findCustomerIdsForSchedule;
    findAnnouncementTargetsOf = findAnnouncementTargetsOf;
    listKitchenSlots = listKitchenSlots;
    listCourierSlots = listCourierSlots;
    getSlotForObstacle = getSlotForObstacle;
}
