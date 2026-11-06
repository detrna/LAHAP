import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { PackageCreateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function createPackage(this: CatalogController, req: Request, res: Response): Promise<void> {
    res.status(201).json(createSuccessResponse(await this.catalogService.createPackage(req.body as PackageCreateBody)));
}
