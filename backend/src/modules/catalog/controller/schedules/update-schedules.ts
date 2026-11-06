import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuScheduleBatchUpdateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function updateSchedules(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { items } = req.body as MenuScheduleBatchUpdateBody;
    res.json(createSuccessResponse(await this.catalogService.updateSchedules(items)));
}
