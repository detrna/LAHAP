import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { MenuCreateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function createMenu(this: CatalogController, req: Request, res: Response): Promise<void> {
    res.status(201).json(createSuccessResponse(await this.catalogService.createMenu(req.body as MenuCreateBody)));
}
