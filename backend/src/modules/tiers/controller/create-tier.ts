import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { TierCreateBody } from "../schema/tiers.schemas.js";
import type { TiersController } from "./tiers.controller.js";

export async function createTier(this: TiersController, req: Request, res: Response): Promise<void> {
    res.status(201).json(createSuccessResponse(await this.tiersService.createTier(req.body as TierCreateBody)));
}
