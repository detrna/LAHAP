import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { PackageIdParams, PackageScheduleQuery } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function listPackageSchedules(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as PackageIdParams;
    const { from, to } = req.query as unknown as PackageScheduleQuery;
    res.json(createSuccessResponse(await this.catalogService.listPublishedSchedules(id, { from, to })));
}
