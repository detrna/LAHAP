import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { TiersController } from "./tiers.controller.js";

export async function getMyMembership(this: TiersController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    res.json(createSuccessResponse(await this.tiersService.getMembershipOverview(userId)));
}
