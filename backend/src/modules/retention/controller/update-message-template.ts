import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { MessageTemplateIdParams, MessageTemplateUpdateBody } from "../schema/retention.schemas.js";
import type { RetentionController } from "./retention.controller.js";

export async function updateMessageTemplate(this: RetentionController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MessageTemplateIdParams;
    const template = await this.retentionService.updateMessageTemplate(id, req.body as MessageTemplateUpdateBody);
    res.json(createSuccessResponse(template));
}
