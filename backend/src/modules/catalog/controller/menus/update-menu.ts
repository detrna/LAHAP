import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuIdParams, MenuUpdateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function updateMenu(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MenuIdParams;
    res.json(createSuccessResponse(await this.catalogService.updateMenu(id, req.body as MenuUpdateBody)));
}
