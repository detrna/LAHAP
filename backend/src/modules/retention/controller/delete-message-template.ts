import type { Request, Response } from "express";
import type { MessageTemplateIdParams } from "../schema/retention.schemas.js";
import type { RetentionController } from "./retention.controller.js";

export async function deleteMessageTemplate(this: RetentionController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as MessageTemplateIdParams;
    await this.retentionService.deleteMessageTemplate(id);
    res.status(204).end();
}
