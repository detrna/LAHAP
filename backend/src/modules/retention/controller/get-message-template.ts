import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { MessageTemplateIdParams } from "../schema/retention.schemas.js";
import type { RetentionController } from "./retention.controller.js";

export async function getMessageTemplate(this: RetentionController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MessageTemplateIdParams;
    res.json(createSuccessResponse(await this.retentionService.getMessageTemplate(id)));
}
