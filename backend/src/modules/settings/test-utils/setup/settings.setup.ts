import { SettingsController } from "../../controller/settings.controller.js";
import type { SettingsRepository } from "../../service/interfaces/settings.repository.js";
import { SettingsService } from "../../service/settings.service.js";
import {
    createMockSettingsRepository,
    createMockSettingsService,
    type Mocked,
    type MockedSettingsService,
} from "../mocks/settings.mocks.js";

export interface SettingsServiceSetup {
    readonly repository: Mocked<SettingsRepository>;
    readonly service: SettingsService;
}

export interface SettingsControllerSetup {
    readonly settingsService: MockedSettingsService;
    readonly controller: SettingsController;
}

export function setupSettingsService(): SettingsServiceSetup {
    const repository = createMockSettingsRepository();
    return { repository, service: new SettingsService(repository) };
}

export function setupSettingsController(): SettingsControllerSetup {
    const settingsService = createMockSettingsService();
    return { settingsService, controller: new SettingsController(settingsService as unknown as SettingsService) };
}
