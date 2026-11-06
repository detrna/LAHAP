import type { Settings } from "../domain/settings.domain.js";
import { BusinessNotConfiguredError } from "./interfaces/settings.repository.js";
import type { SettingsService } from "./settings.service.js";
import { toSettings } from "./to-settings.js";

export async function getSettings(this: SettingsService): Promise<Settings> {
    const record = await this.settingsRepository.find();
    if (record === null) throw new BusinessNotConfiguredError();
    return toSettings(record);
}
