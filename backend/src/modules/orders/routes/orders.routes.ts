import { Router } from "express";
import {
    authenticate,
    authorize,
    paginate,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { OrdersController } from "../controller/orders.controller.js";
import {
    adminMethodChangeListQuerySchema,
    adminPaymentListQuerySchema,
    adminSlotListQuerySchema,
    adminSubscriptionListQuerySchema,
    checkoutSchema,
    courierAssignmentQuerySchema,
    courierAssignmentSchema,
    deliveryMethodChangeSchema,
    foodReadySchema,
    methodChangeIdParamsSchema,
    orderIdParamsSchema,
    paymentIdParamsSchema,
    paymentListQuerySchema,
    reportPeriodQuerySchema,
    skipDaySchema,
    skipSchema,
    slotDateQuerySchema,
    statusCorrectionSchema,
    subscriptionIdParamsSchema,
    subscriptionListQuerySchema,
} from "../schema/orders.schemas.js";

export interface OrdersRouterDeps {
    readonly controller: OrdersController;
    readonly tokenProvider: TokenProvider;
}

export function createOrdersRouter({ controller, tokenProvider }: OrdersRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const customer = authorize("CUSTOMER");
    const admin = authorize("ADMIN");
    const kitchen = authorize("KITCHEN", "ADMIN");
    const courier = authorize("COURIER", "ADMIN");

    router.post("/subscriptions/preview", signedIn, customer, validateBody(checkoutSchema), controller.previewCheckout);
    router.post("/subscriptions", signedIn, customer, validateBody(checkoutSchema), controller.createSubscription);
    router.post(
        "/subscriptions/:id/payment-session",
        signedIn,
        customer,
        validateParams(subscriptionIdParamsSchema),
        controller.getPaymentSession,
    );

    router.get(
        "/subscriptions",
        signedIn,
        customer,
        validateQuery(subscriptionListQuerySchema),
        paginate(),
        controller.listMySubscriptions,
    );
    router.get(
        "/subscriptions/:id",
        signedIn,
        customer,
        validateParams(subscriptionIdParamsSchema),
        controller.getMySubscription,
    );
    router.post(
        "/subscriptions/:id/cancel",
        signedIn,
        customer,
        validateParams(subscriptionIdParamsSchema),
        controller.cancelSubscription,
    );
    router.post(
        "/subscriptions/:id/delivery-method/preview",
        signedIn,
        customer,
        validateParams(subscriptionIdParamsSchema),
        validateBody(deliveryMethodChangeSchema),
        controller.previewMethodChange,
    );
    router.post(
        "/subscriptions/:id/delivery-method",
        signedIn,
        customer,
        validateParams(subscriptionIdParamsSchema),
        validateBody(deliveryMethodChangeSchema),
        controller.changeDeliveryMethod,
    );
    router.post(
        "/delivery-method-changes/:id/payment-session",
        signedIn,
        customer,
        validateParams(methodChangeIdParamsSchema),
        controller.getMethodChangePaymentSession,
    );
    router.get("/orders", signedIn, customer, validateQuery(slotDateQuerySchema), controller.listMySlots);
    router.post("/orders/skip-day", signedIn, customer, validateBody(skipDaySchema), controller.skipDay);
    router.post(
        "/orders/:id/skip",
        signedIn,
        customer,
        validateRequest({ params: orderIdParamsSchema, body: skipSchema }),
        controller.skipSlot,
    );
    router.get(
        "/payments",
        signedIn,
        customer,
        validateQuery(paymentListQuerySchema),
        paginate(),
        controller.listMyPayments,
    );

    router.post("/kitchen/food-ready", signedIn, kitchen, validateBody(foodReadySchema), controller.markFoodReady);
    router.post(
        "/kitchen/orders/:id/alternative-menu",
        signedIn,
        kitchen,
        validateParams(orderIdParamsSchema),
        controller.assignAlternativeMenu,
    );
    router.delete(
        "/kitchen/orders/:id/alternative-menu",
        signedIn,
        kitchen,
        validateParams(orderIdParamsSchema),
        controller.removeAlternativeMenu,
    );

    router.post(
        "/courier/orders/:id/complete",
        signedIn,
        courier,
        validateParams(orderIdParamsSchema),
        controller.completeDelivery,
    );
    router.post(
        "/admin/orders/:id/complete",
        signedIn,
        admin,
        validateParams(orderIdParamsSchema),
        controller.completePickup,
    );
    router.patch(
        "/admin/orders/:id/status",
        signedIn,
        admin,
        validateRequest({ params: orderIdParamsSchema, body: statusCorrectionSchema }),
        controller.correctSlotStatus,
    );
    router.get(
        "/admin/courier-assignments",
        signedIn,
        admin,
        validateQuery(courierAssignmentQuerySchema),
        controller.listCourierAssignments,
    );
    router.put(
        "/admin/courier-assignments",
        signedIn,
        admin,
        validateBody(courierAssignmentSchema),
        controller.assignCourier,
    );

    router.get(
        "/admin/subscriptions",
        signedIn,
        admin,
        validateQuery(adminSubscriptionListQuerySchema),
        paginate(),
        controller.listSubscriptionsForAdmin,
    );
    router.get(
        "/admin/subscriptions/:id",
        signedIn,
        admin,
        validateParams(subscriptionIdParamsSchema),
        controller.getSubscriptionForAdmin,
    );
    router.post(
        "/admin/subscriptions/:id/delivery-method/preview",
        signedIn,
        admin,
        validateParams(subscriptionIdParamsSchema),
        validateBody(deliveryMethodChangeSchema),
        controller.previewMethodChangeForAdmin,
    );
    router.post(
        "/admin/subscriptions/:id/delivery-method",
        signedIn,
        admin,
        validateParams(subscriptionIdParamsSchema),
        validateBody(deliveryMethodChangeSchema),
        controller.changeDeliveryMethodForAdmin,
    );
    router.get(
        "/admin/delivery-method-changes",
        signedIn,
        admin,
        validateQuery(adminMethodChangeListQuerySchema),
        paginate(),
        controller.listMethodChangesForAdmin,
    );
    router.post(
        "/admin/delivery-method-changes/:id/confirm-refund",
        signedIn,
        admin,
        validateParams(methodChangeIdParamsSchema),
        controller.confirmMethodChangeRefund,
    );
    router.get(
        "/admin/orders",
        signedIn,
        admin,
        validateQuery(adminSlotListQuerySchema),
        paginate(),
        controller.listSlotsForAdmin,
    );
    router.get("/admin/orders/:id", signedIn, admin, validateParams(orderIdParamsSchema), controller.getSlotForAdmin);
    router.get(
        "/admin/payments",
        signedIn,
        admin,
        validateQuery(adminPaymentListQuerySchema),
        paginate(),
        controller.listPaymentsForAdmin,
    );

    router.get(
        "/admin/reports/income",
        signedIn,
        admin,
        validateQuery(reportPeriodQuerySchema),
        controller.getIncomeReport,
    );
    router.get("/admin/dashboard", signedIn, admin, validateQuery(reportPeriodQuerySchema), controller.getDashboard);

    router.post("/webhooks/midtrans", controller.handleMidtransNotification);
    router.post(
        "/admin/payments/:id/verify-cash",
        signedIn,
        admin,
        validateParams(paymentIdParamsSchema),
        controller.verifyCashPayment,
    );
    router.post(
        "/admin/payments/:id/confirm-refund",
        signedIn,
        admin,
        validateParams(paymentIdParamsSchema),
        controller.confirmRefund,
    );

    return router;
}
