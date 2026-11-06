import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { SettingsController } from "./settings.controller.js";

export async function getSettings(this: SettingsController, _req: Request, res: Response): Promise<void> {
    res.json(createSuccessResponse(await this.settingsService.getSettings()));
}
