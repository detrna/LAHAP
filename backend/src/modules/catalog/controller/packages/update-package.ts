import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { PackageIdParams, PackageUpdateBody } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function updatePackage(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as PackageIdParams;
    res.json(createSuccessResponse(await this.catalogService.updatePackage(id, req.body as PackageUpdateBody)));
}
