import type { Request, Response } from "express";
import type { MenuIdParams } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function deleteMenu(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MenuIdParams;
    await this.catalogService.deleteMenu(id);
    res.status(204).end();
}
