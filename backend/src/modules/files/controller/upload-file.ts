import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { FileUploadBody } from "../schema/files.schemas.js";
import type { FilesController } from "./files.controller.js";

export async function uploadFile(this: FilesController, req: Request, res: Response): Promise<void> {
    const { role } = (req as AuthenticatedRequest).user;
    const { folder } = req.body as FileUploadBody;
    const file = req.file as Express.Multer.File;
    const uploaded = await this.filesService.uploadFile({
        folder,
        body: file.buffer,
        contentType: file.mimetype,
        role,
    });
    res.status(201).json(createSuccessResponse(uploaded));
}
