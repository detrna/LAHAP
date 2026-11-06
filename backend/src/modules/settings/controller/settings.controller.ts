import type { SettingsService } from "../service/settings.service.js";
import { getBusinessInfo } from "./get-business-info.js";
import { getSettings } from "./get-settings.js";
import { updateSettings } from "./update-settings.js";

export class SettingsController {
    constructor(readonly settingsService: SettingsService) {}

    getBusinessInfo = getBusinessInfo.bind(this);
    getSettings = getSettings.bind(this);
    updateSettings = updateSettings.bind(this);
}
