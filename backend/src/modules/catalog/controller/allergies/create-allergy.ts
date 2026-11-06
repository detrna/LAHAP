import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { AllergyCreateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function createAllergy(this: CatalogController, req: Request, res: Response): Promise<void> {
    res.status(201).json(createSuccessResponse(await this.catalogService.createAllergy(req.body as AllergyCreateBody)));
}
