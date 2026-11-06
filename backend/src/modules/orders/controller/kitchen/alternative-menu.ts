import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { OrdersController } from "../orders.controller.js";

export async function assignAlternativeMenu(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.setAlternativeMenu(id, true)));
}

export async function removeAlternativeMenu(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.setAlternativeMenu(id, false)));
}
