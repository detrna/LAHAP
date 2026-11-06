import type { Request, Response } from "express";
import type { AllergyIdParams } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function deleteAllergy(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as AllergyIdParams;
    await this.catalogService.deleteAllergy(id);
    res.status(204).end();
}
