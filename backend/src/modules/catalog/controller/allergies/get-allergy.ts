import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { AllergyIdParams } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function getAllergy(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as AllergyIdParams;
    res.json(createSuccessResponse(await this.catalogService.getAllergy(id)));
}
