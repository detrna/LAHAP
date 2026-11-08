import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function extractReceipt(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const file = req.file as Express.Multer.File;
    const extracted = await this.ingredientsService.extractReceipt({ image: file.buffer, mimeType: file.mimetype });
    res.json(createSuccessResponse(extracted));
}
