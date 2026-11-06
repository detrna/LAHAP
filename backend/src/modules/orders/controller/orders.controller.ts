import type { OrdersService } from "../service/orders.service.js";
import {
    getSlotForAdmin,
    getSubscriptionForAdmin,
    listPaymentsForAdmin,
    listSlotsForAdmin,
    listSubscriptionsForAdmin,
} from "./admin/admin-lists.js";
import { createSubscription } from "./checkout/create-subscription.js";
import { previewCheckout } from "./checkout/preview-checkout.js";
import {
    assignCourier,
    completeDelivery,
    completePickup,
    correctSlotStatus,
    listCourierAssignments,
} from "./delivery/slot-actions.js";
import { assignAlternativeMenu, removeAlternativeMenu } from "./kitchen/alternative-menu.js";
import { markFoodReady } from "./kitchen/mark-food-ready.js";
import { confirmRefund } from "./payments/confirm-refund.js";
import { getPaymentSession } from "./payments/get-payment-session.js";
import { handleMidtransNotification } from "./payments/handle-midtrans-notification.js";
import { listMyPayments } from "./payments/list-my-payments.js";
import { getDashboard, getIncomeReport } from "./reports/reports.js";
import { verifyCashPayment } from "./payments/verify-cash-payment.js";
import { listMySlots } from "./slots/list-my-slots.js";
import { skipDay } from "./slots/skip-day.js";
import { skipSlot } from "./slots/skip-slot.js";
import { cancelSubscription } from "./subscriptions/cancel-subscription.js";
import { getMySubscription } from "./subscriptions/get-my-subscription.js";
import { listMySubscriptions } from "./subscriptions/list-my-subscriptions.js";

export class OrdersController {
    constructor(readonly ordersService: OrdersService) {}

    previewCheckout = previewCheckout.bind(this);
    createSubscription = createSubscription.bind(this);
    getPaymentSession = getPaymentSession.bind(this);
    handleMidtransNotification = handleMidtransNotification.bind(this);
    verifyCashPayment = verifyCashPayment.bind(this);
    confirmRefund = confirmRefund.bind(this);
    listMyPayments = listMyPayments.bind(this);
    listMySubscriptions = listMySubscriptions.bind(this);
    getMySubscription = getMySubscription.bind(this);
    cancelSubscription = cancelSubscription.bind(this);
    listMySlots = listMySlots.bind(this);
    skipSlot = skipSlot.bind(this);
    skipDay = skipDay.bind(this);
    markFoodReady = markFoodReady.bind(this);
    assignAlternativeMenu = assignAlternativeMenu.bind(this);
    removeAlternativeMenu = removeAlternativeMenu.bind(this);
    completeDelivery = completeDelivery.bind(this);
    completePickup = completePickup.bind(this);
    correctSlotStatus = correctSlotStatus.bind(this);
    listCourierAssignments = listCourierAssignments.bind(this);
    assignCourier = assignCourier.bind(this);
    listSubscriptionsForAdmin = listSubscriptionsForAdmin.bind(this);
    getSubscriptionForAdmin = getSubscriptionForAdmin.bind(this);
    listSlotsForAdmin = listSlotsForAdmin.bind(this);
    getSlotForAdmin = getSlotForAdmin.bind(this);
    listPaymentsForAdmin = listPaymentsForAdmin.bind(this);
    getIncomeReport = getIncomeReport.bind(this);
    getDashboard = getDashboard.bind(this);
}
