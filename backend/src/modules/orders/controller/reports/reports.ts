import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { ReportPeriodQuery } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function getIncomeReport(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { period } = req.query as unknown as ReportPeriodQuery;
    res.json(createSuccessResponse(await this.ordersService.getIncomeReport(period)));
}

export async function getDashboard(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { period } = req.query as unknown as ReportPeriodQuery;
    res.json(createSuccessResponse(await this.ordersService.getDashboard(req.user!.userId, period)));
}
