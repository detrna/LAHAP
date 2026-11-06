import { getBusinessInfo } from "./get-business-info.js";
import { getSettings } from "./get-settings.js";
import type { SettingsRepository } from "./interfaces/settings.repository.js";
import { updateSettings } from "./update-settings.js";

export class SettingsService {
    constructor(readonly settingsRepository: SettingsRepository) {}

    getSettings = getSettings;
    getBusinessInfo = getBusinessInfo;
    updateSettings = updateSettings;
}
