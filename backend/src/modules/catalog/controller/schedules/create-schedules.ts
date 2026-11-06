import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuScheduleBatchCreateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function createSchedules(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { items } = req.body as MenuScheduleBatchCreateBody;
    res.status(201).json(createSuccessResponse(await this.catalogService.createSchedules(items)));
}
