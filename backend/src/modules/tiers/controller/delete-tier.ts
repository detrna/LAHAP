import type { Request, Response } from "express";
import type { TierIdParams } from "../schema/tiers.schemas.js";
import type { TiersController } from "./tiers.controller.js";

export async function deleteTier(this: TiersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as TierIdParams;
    await this.tiersService.deleteTier(id);
    res.status(204).end();
}
