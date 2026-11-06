import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuIdParams } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function getMenu(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MenuIdParams;
    res.json(createSuccessResponse(await this.catalogService.getMenu(id)));
}
