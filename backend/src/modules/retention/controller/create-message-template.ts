import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { MessageTemplateCreateBody } from "../schema/retention.schemas.js";
import type { RetentionController } from "./retention.controller.js";

export async function createMessageTemplate(this: RetentionController, req: Request, res: Response): Promise<void> {
    const template = await this.retentionService.createMessageTemplate(req.body as MessageTemplateCreateBody);
    res.status(201).json(createSuccessResponse(template));
}
