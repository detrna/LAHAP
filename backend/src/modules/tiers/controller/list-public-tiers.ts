import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { TiersController } from "./tiers.controller.js";

export async function listPublicTiers(this: TiersController, _req: Request, res: Response): Promise<void> {
    res.json(createSuccessResponse(await this.tiersService.listPublicTiers()));
}
