import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type {
    CourierAssignmentBody,
    CourierAssignmentQuery,
    StatusCorrectionBody,
} from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function completeDelivery(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { userId, role } = req.user!;
    res.json(createSuccessResponse(await this.ordersService.completeDelivery({ userId, role }, id)));
}

export async function completePickup(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.completePickup(req.user!.userId, id)));
}

export async function correctSlotStatus(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const correction = req.body as StatusCorrectionBody;
    res.json(createSuccessResponse(await this.ordersService.correctSlotStatus(req.user!.userId, id, correction)));
}

export async function listCourierAssignments(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { from, to } = req.query as unknown as CourierAssignmentQuery;
    res.json(createSuccessResponse(await this.ordersService.listCourierAssignments({ from, to })));
}

export async function assignCourier(this: OrdersController, req: Request, res: Response): Promise<void> {
    res.json(createSuccessResponse(await this.ordersService.assignCourier(req.body as CourierAssignmentBody)));
}
