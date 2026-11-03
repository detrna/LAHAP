import type { SettingsRepository } from "./interfaces/settings.repository.js";

export class SettingsService {
    constructor(readonly settingsRepository: SettingsRepository) {}
}
