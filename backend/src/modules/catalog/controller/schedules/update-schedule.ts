import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuScheduleIdParams, MenuScheduleUpdateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function updateSchedule(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MenuScheduleIdParams;
    res.json(createSuccessResponse(await this.catalogService.updateSchedule(id, req.body as MenuScheduleUpdateBody)));
}
