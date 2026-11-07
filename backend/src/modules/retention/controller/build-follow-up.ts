import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { ChurnFollowUpBody, ChurnUserIdParams } from "../schema/retention.schemas.js";
import type { RetentionController } from "./retention.controller.js";

export async function buildFollowUp(this: RetentionController, req: Request, res: Response): Promise<void> {
    const { userId } = req.params as ChurnUserIdParams;
    res.json(createSuccessResponse(await this.retentionService.buildFollowUp(userId, req.body as ChurnFollowUpBody)));
}
