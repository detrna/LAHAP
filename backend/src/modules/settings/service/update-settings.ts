import type { Settings } from "../domain/settings.domain.js";
import type { SettingsChanges } from "./interfaces/settings.repository.js";
import type { SettingsService } from "./settings.service.js";
import { toSettings } from "./to-settings.js";

export async function updateSettings(this: SettingsService, changes: SettingsChanges): Promise<Settings> {
    return toSettings(await this.settingsRepository.save(changes));
}
