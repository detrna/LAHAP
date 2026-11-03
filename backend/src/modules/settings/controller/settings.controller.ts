import type { SettingsService } from "../service/settings.service.js";

export class SettingsController {
    constructor(readonly settingsService: SettingsService) {}
}
