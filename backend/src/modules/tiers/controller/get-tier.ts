import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { TierIdParams } from "../schema/tiers.schemas.js";
import type { TiersController } from "./tiers.controller.js";

export async function getTier(this: TiersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as TierIdParams;
    res.json(createSuccessResponse(await this.tiersService.getTier(id)));
}
