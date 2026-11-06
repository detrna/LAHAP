import type { Request, Response } from "express";
import type { PackageIdParams } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function deletePackage(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as PackageIdParams;
    await this.catalogService.deletePackage(id);
    res.status(204).end();
}
