import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse, createSuccessResponse } from "../../../../shared/response/index.js";
import type { AdminMethodChangeListQuery, DeliveryMethodChangeBody } from "../../schema/orders.schemas.js";
import type { MethodChangeActor } from "../../service/method-change/method-change-input.js";
import type { OrdersController } from "../orders.controller.js";

const actorOf = (req: Request, asAdmin: boolean): MethodChangeActor => ({ userId: req.user!.userId, asAdmin });
const subscriptionIdOf = (req: Request) => (req.params as { id: string }).id;

async function preview(controller: OrdersController, req: Request, res: Response, asAdmin: boolean) {
    const preview = await controller.ordersService.previewMethodChange(
        actorOf(req, asAdmin),
        subscriptionIdOf(req),
        req.body as DeliveryMethodChangeBody,
    );
    res.json(createSuccessResponse(preview));
}

async function change(controller: OrdersController, req: Request, res: Response, asAdmin: boolean) {
    const result = await controller.ordersService.changeDeliveryMethod(
        actorOf(req, asAdmin),
        subscriptionIdOf(req),
        req.body as DeliveryMethodChangeBody,
    );
    res.status(201).json(createSuccessResponse(result));
}

export async function previewMethodChange(this: OrdersController, req: Request, res: Response): Promise<void> {
    await preview(this, req, res, false);
}

export async function previewMethodChangeForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    await preview(this, req, res, true);
}

export async function changeDeliveryMethod(this: OrdersController, req: Request, res: Response): Promise<void> {
    await change(this, req, res, false);
}

export async function changeDeliveryMethodForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    await change(this, req, res, true);
}

export async function getMethodChangePaymentSession(
    this: OrdersController,
    req: Request,
    res: Response,
): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.getMethodChangePaymentSession(req.user!.userId, id)));
}

export async function listMethodChangesForAdmin(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { needsRefund } = req.query as unknown as AdminMethodChangeListQuery;
    const { items, total } = await this.ordersService.listMethodChangesForAdmin({ needsRefund, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

export async function confirmMethodChangeRefund(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.confirmMethodChangeRefund(id)));
}
