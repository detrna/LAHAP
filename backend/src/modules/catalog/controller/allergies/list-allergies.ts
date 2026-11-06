import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { CatalogController } from "../catalog.controller.js";

export async function listAllergies(this: CatalogController, _req: Request, res: Response): Promise<void> {
    res.json(createSuccessResponse(await this.catalogService.listAllergies()));
}
