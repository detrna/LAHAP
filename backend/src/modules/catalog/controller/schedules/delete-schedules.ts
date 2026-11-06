import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuScheduleBatchDeleteBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function deleteSchedules(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { ids } = req.body as MenuScheduleBatchDeleteBody;
    res.json(createSuccessResponse(await this.catalogService.deleteSchedules(ids)));
}
