import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { SettingsUpdateBody } from "../schema/settings.schemas.js";
import type { SettingsController } from "./settings.controller.js";

export async function updateSettings(this: SettingsController, req: Request, res: Response): Promise<void> {
    res.json(createSuccessResponse(await this.settingsService.updateSettings(req.body as SettingsUpdateBody)));
}
