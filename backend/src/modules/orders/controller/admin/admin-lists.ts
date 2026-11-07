import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse, createSuccessResponse } from "../../../../shared/response/index.js";
import type { PaymentMethod } from "../../domain/payment.domain.js";
import type {
    AdminPaymentListQuery,
    AdminSlotListQuery,
    AdminSubscriptionListQuery,
} from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

function pageOf(req: Request) {
    return (req as PaginatedRequest).pagination;
}

export async function listSubscriptionsForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = pageOf(req);
    const { status, userId, packageId, purchaseType, needsRefund, from, to } =
        req.query as unknown as AdminSubscriptionListQuery;
    const { items, total } = await this.ordersService.listSubscriptionsForAdmin({
        status,
        userId,
        packageId,
        purchaseType,
        needsRefund,
        from,
        to,
        skip,
        take,
    });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

export async function getSubscriptionForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.getSubscriptionForAdmin(id)));
}

export async function listSlotsForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = pageOf(req);
    const { date, deliveryTime, status, isDelivery, courierId, unassigned, packageId, subscriptionId } =
        req.query as unknown as AdminSlotListQuery;
    const { items, total } = await this.ordersService.listSlotsForAdmin({
        date,
        deliveryTime,
        status,
        isDelivery,
        courierId,
        unassigned,
        packageId,
        subscriptionId,
        skip,
        take,
    });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

export async function getSlotForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.getSlotForAdmin(id)));
}

export async function listPaymentsForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = pageOf(req);
    const { status, type, method, userId, needsRefund, from, to } = req.query as unknown as AdminPaymentListQuery;
    const { items, total } = await this.ordersService.listPaymentsForAdmin({
        status,
        type,
        method: method as PaymentMethod | undefined,
        userId,
        needsRefund,
        from,
        to,
        skip,
        take,
    });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}
