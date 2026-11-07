import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { OrdersRepository } from "../../service/interfaces/orders.repository.js";
import { createCheckout } from "./checkout/create-checkout.js";
import { changePayment } from "./payments/change-payment.js";
import { expirePendingPayments } from "./payments/expire-pending-payments.js";
import { findPaymentsBySubscriptionId } from "./payments/find-payments-by-subscription-id.js";
import { listPayments } from "./payments/list-payments.js";
import {
    findCompletionTimes,
    findCustomerSlots,
    findOrdersBySubscriptionId,
    findSlotWithSubscription,
} from "./slots/find-slots.js";
import { assignCourier } from "./slots/assign-courier.js";
import { findSlots } from "./slots/find-slots-by-query.js";
import { setUsesAlternativeMenu } from "./slots/set-uses-alternative-menu.js";
import { findStatusHistory, listSlots } from "./slots/list-slots.js";
import { transitionSlots } from "./slots/transition-slots.js";
import { cancelSubscription } from "./subscriptions/cancel-subscription.js";
import { countPromoUses, countPromoUsesByUser, hasSubscriptionsWithPromo } from "./provided/count-promo-uses.js";
import {
    findAnnouncementTargets,
    findCustomerIdsByPackage,
    findCustomerIdsBySchedule,
} from "./provided/announcement-audience.js";
import {
    countActiveSubscribers,
    deleteSlotsOfSubscriptions,
    findScheduleIdsUsingAlternative,
    findScheduleIdsWithSlots,
    findSubscriptionPeriods,
} from "./provided/order-activity.js";
import { findLastSuccessEndDates } from "./provided/find-last-success-end-dates.js";
import { findLastSuccessSummaries } from "./provided/find-last-success-summaries.js";
import { findUserIdsWithLastSuccessEndBefore } from "./provided/find-user-ids-with-last-success-end-before.js";
import { countPaidServiceDays, sumTierDiscounts } from "./provided/order-stats.js";
import { countPortions } from "./reports/count-portions.js";
import { sumIncome } from "./reports/sum-income.js";
import { findSubscriptionById } from "./subscriptions/find-subscription-by-id.js";
import { listSubscriptions } from "./subscriptions/list-subscriptions.js";

export class PrismaOrdersRepository implements OrdersRepository {
    constructor(readonly db: Db) {}

    createCheckout = createCheckout;
    findSubscriptionById = findSubscriptionById;
    findPaymentsBySubscriptionId = findPaymentsBySubscriptionId;
    changePayment = changePayment;
    expirePendingPayments = expirePendingPayments;
    listSubscriptions = listSubscriptions;
    listPayments = listPayments;
    listSlots = listSlots;
    findStatusHistory = findStatusHistory;
    findOrdersBySubscriptionId = findOrdersBySubscriptionId;
    findSlotWithSubscription = findSlotWithSubscription;
    findCustomerSlots = findCustomerSlots;
    findCompletionTimes = findCompletionTimes;
    findSlots = findSlots;
    transitionSlots = transitionSlots;
    setUsesAlternativeMenu = setUsesAlternativeMenu;
    assignCourier = assignCourier;
    cancelSubscription = cancelSubscription;

    countPromoUses = countPromoUses;
    countPromoUsesByUser = countPromoUsesByUser;
    hasSubscriptionsWithPromo = hasSubscriptionsWithPromo;
    countPortions = countPortions;
    sumIncome = sumIncome;
    countPaidServiceDays = countPaidServiceDays;
    sumTierDiscounts = sumTierDiscounts;
    findLastSuccessEndDates = findLastSuccessEndDates;
    findUserIdsWithLastSuccessEndBefore = findUserIdsWithLastSuccessEndBefore;
    findLastSuccessSummaries = findLastSuccessSummaries;
    countActiveSubscribers = countActiveSubscribers;
    findScheduleIdsWithSlots = findScheduleIdsWithSlots;
    findScheduleIdsUsingAlternative = findScheduleIdsUsingAlternative;
    findSubscriptionPeriods = findSubscriptionPeriods;
    deleteSlotsOfSubscriptions = deleteSlotsOfSubscriptions;
    findCustomerIdsByPackage = findCustomerIdsByPackage;
    findCustomerIdsBySchedule = findCustomerIdsBySchedule;
    findAnnouncementTargets = findAnnouncementTargets;
}
